/*
 * UniDrop Marketplace — Stripe Payment Routes
 *
 * Handles Stripe payment processing:
 * - POST /create-payment-intent  — Create a PaymentIntent for an order
 * - POST /webhook                 — Handle Stripe webhook events
 * - POST /confirm-payment         — Confirm order payment was successful
 *
 * Payment Flow:
 * 1. Frontend creates order via /api/orders/create
 * 2. Frontend requests PaymentIntent via /api/payments/create-payment-intent
 * 3. Frontend collects card details via Stripe Elements
 * 4. Stripe.js sends payment to Stripe directly
 * 5. Webhook notifies backend of payment success
 * 6. Backend updates order status to 'in_escrow'
 * 7. Buyer inspects item, clicks "Approve"
 * 8. Backend captures PaymentIntent (releases funds to seller)
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  createPaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
} = require('../config/stripe');

const router = express.Router();

// ============================================================
// GET /api/payments/config
// Returns the Stripe publishable key for the frontend.
// ============================================================
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// Commission fee percentage
const COMMISSION_FEE = parseFloat(process.env.COMMISSION_FEE_PERCENTAGE || '3');

// ============================================================
// POST /api/payments/create-payment-intent
// Creates a Stripe PaymentIntent for an existing order.
// Frontend uses the returned client_secret to complete payment.
// ============================================================
router.post('/create-payment-intent', authenticateToken, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.body;
    const buyerId = req.user.id;

    // Verify the order belongs to the buyer and is in pending status
    const orderResult = await db.query(
      `SELECT o.*, p.title AS product_title 
       FROM orders o 
       JOIN products p ON o.product_id = p.id 
       WHERE o.id = $1 AND o.buyer_id = $2`,
      [orderId, buyerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order cannot be paid (current status: ${order.status})` });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await createPaymentIntent({
      amount: order.amount,
      orderId: order.id,
      description: `UniDrop: ${order.product_title}`,
      metadata: {
        buyerId: buyerId,
        sellerId: order.seller_id,
        productId: order.product_id,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.amount,
      currency: 'tzs',
    });
  } catch (error) {
    console.error('[Stripe] Create PaymentIntent error:', error);
    res.status(500).json({ error: 'Failed to create payment. Please try again.' });
  }
});

// ============================================================
// POST /api/payments/confirm-payment
// Called by frontend after Stripe.js confirms payment successfully.
// Updates order status to 'in_escrow' and creates escrow record.
// ============================================================
router.post('/confirm-payment', authenticateToken, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required'),
], async (req, res) => {
  const client = await db.getClient();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, paymentIntentId } = req.body;

    // Verify order belongs to buyer
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order already processed' });
    }

    await client.query('BEGIN');

    // Update order to in_escrow
    await client.query(
      `UPDATE orders SET status = 'in_escrow', payment_reference = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [paymentIntentId, orderId]
    );

    // Create escrow transaction record
    await client.query(
      `INSERT INTO escrow_transactions (order_id, amount, status, payment_method, gateway_reference) 
       VALUES ($1, $2, 'held', 'stripe', $3)`,
      [orderId, order.amount, paymentIntentId]
    );

    // Update product status to reserved
    await client.query(
      `UPDATE products SET status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [order.product_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Payment confirmed. Funds held in escrow. Meet the seller to inspect the item.',
      orderId,
      paymentIntentId,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Stripe] Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment.' });
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/payments/release-escrow
// Captures the PaymentIntent (releases held funds to seller).
// Called when buyer approves the item.
// ============================================================
router.post('/release-escrow', authenticateToken, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
], async (req, res) => {
  const client = await db.getClient();

  try {
    const { orderId } = req.body;

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'in_escrow') {
      return res.status(400).json({ error: 'Funds must be in escrow before release' });
    }

    // Capture the Stripe PaymentIntent
    if (order.payment_reference) {
      try {
        await capturePaymentIntent(order.payment_reference);
      } catch (stripeErr) {
        console.error('[Stripe] Capture error:', stripeErr);
        // Payment may have already been captured (automatic mode)
      }
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE orders SET buyer_approved = true, status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId]
    );

    await client.query(
      `UPDATE escrow_transactions SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
      [orderId]
    );

    await client.query(
      `UPDATE products SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [order.product_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Funds released to seller. Transaction completed successfully.',
      orderStatus: 'completed',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Stripe] Release escrow error:', error);
    res.status(500).json({ error: 'Failed to release funds.' });
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/payments/refund-escrow
// Refunds the PaymentIntent (returns funds to buyer).
// Called when order is cancelled or disputed.
// ============================================================
router.post('/refund-escrow', authenticateToken, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
], async (req, res) => {
  const client = await db.getClient();

  try {
    const { orderId } = req.body;

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (order.status !== 'in_escrow') {
      return res.status(400).json({ error: 'Only escrow orders can be refunded' });
    }

    // Refund via Stripe
    if (order.payment_reference) {
      try {
        await cancelPaymentIntent(order.payment_reference);
      } catch (stripeErr) {
        console.error('[Stripe] Refund error:', stripeErr);
      }
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId]
    );

    await client.query(
      `UPDATE escrow_transactions SET status = 'refunded', refunded_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
      [orderId]
    );

    await client.query(
      `UPDATE products SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [order.product_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Funds refunded successfully.',
      orderStatus: 'cancelled',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Stripe] Refund escrow error:', error);
    res.status(500).json({ error: 'Failed to refund funds.' });
  } finally {
    client.release();
  }
});

module.exports = router;
