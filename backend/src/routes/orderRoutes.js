/*
 * UniDrop Marketplace - Order Routes & Controller
 * 
 * Manages the complete purchase lifecycle:
 * - POST   /create         - Create order (Buy Now / Reserve)
 * - GET    /my-orders      - Get current user's orders (buying & selling)
 * - GET    /:id            - Get single order details
 * - PUT    /:id/approve    - Buyer approves item and releases escrow funds
 * - PUT    /:id/cancel     - Cancel an order
 * - PUT    /:id/dispute    - Raise a dispute on an order
 * - GET    /seller/:sellerId - Get orders for a specific seller
 * 
 * Commission Fee: Calculated as percentage of order amount per BUSINESS CONCEPT.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Commission fee percentage (from env, default 3%)
const COMMISSION_FEE = parseFloat(process.env.COMMISSION_FEE_PERCENTAGE || '3');

// ============================================================
// POST /api/orders/create
// Create a new order (Buy Now action)
// ============================================================
router.post('/create', authenticateToken, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('meetingPoint').trim().notEmpty().withMessage('Meeting point is required'),
], async (req, res) => {
  const client = await db.getClient();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, meetingPoint } = req.body;
    const buyerId = req.user.id;

    await client.query('BEGIN');

    // Get product details and verify availability
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 AND status = $2',
      [productId, 'available']
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Product is no longer available' });
    }

    const product = productResult.rows[0];

    // Prevent buying own product
    if (product.seller_id === buyerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You cannot buy your own product' });
    }

    // Calculate commission fee (percentage of product price)
    const priceNum = parseFloat(product.price);
    const commissionFee = (priceNum * COMMISSION_FEE) / 100;
    const totalAmount = priceNum + commissionFee;

    // Create the order
    const orderResult = await client.query(
      `INSERT INTO orders (buyer_id, seller_id, product_id, amount, commission_fee, status, meeting_point) 
       VALUES ($1, $2, $3, $4, $5, 'pending', $6) 
       RETURNING *`,
      [buyerId, product.seller_id, productId, totalAmount, commissionFee, meetingPoint]
    );

    const order = orderResult.rows[0];

    // Mark product as reserved
    await client.query(
      'UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['reserved', productId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully. Please complete payment to secure the item.',
      order,
      commissionFee,
      totalAmount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Orders] Create error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/orders/:id/pay
// Simulate payment initiation (in production: redirect to Selcom/Pesapal)
// ============================================================
router.post('/:id/pay', authenticateToken, async (req, res) => {
  const client = await db.getClient();

  try {
    const { id } = req.params;

    // Verify order belongs to the buyer
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order is not in pending state' });
    }

    // In production: Call Selcom/Pesapal API to initiate mobile money payment
    // For now, simulate payment success and move to escrow
    const paymentReference = `UNIDROP-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await client.query('BEGIN');

    // Update order status to in_escrow
    await client.query(
      `UPDATE orders SET status = 'in_escrow', payment_reference = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [paymentReference, id]
    );

    // Create escrow transaction record
    await client.query(
      `INSERT INTO escrow_transactions (order_id, amount, status, payment_method, gateway_reference) 
       VALUES ($1, $2, 'held', 'mobile_money', $3)`,
      [id, order.amount, paymentReference]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Payment confirmed. Funds held in escrow. Meet the seller to inspect the item.',
      paymentReference,
      orderStatus: 'in_escrow',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Orders] Payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  } finally {
    client.release();
  }
});

// ============================================================
// PUT /api/orders/:id/approve
// Buyer approves item release - escrow funds released to seller
// THIS IS THE CORE ESCROW RELEASE MECHANISM
// ============================================================
router.put('/:id/approve', authenticateToken, async (req, res) => {
  const client = await db.getClient();

  try {
    const { id } = req.params;

    // Verify order belongs to buyer and is in escrow
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'in_escrow') {
      return res.status(400).json({ error: 'Funds must be in escrow before release' });
    }

    await client.query('BEGIN');

    // Mark buyer approval
    await client.query(
      `UPDATE orders SET buyer_approved = true WHERE id = $1`,
      [id]
    );

    // Update order status to completed
    await client.query(
      `UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Release escrow funds to seller
    await client.query(
      `UPDATE escrow_transactions SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
      [id]
    );

    // Mark product as sold
    await client.query(
      `UPDATE products SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [order.product_id]
    );

    // In production: Trigger Selcom/Pesapal API to transfer funds to seller's mobile wallet
    // await paymentGateway.releaseFunds(order.seller_id, order.amount - order.commission_fee);

    await client.query('COMMIT');

    res.json({
      message: 'Item approved! Funds released to seller. Transaction completed successfully.',
      orderStatus: 'completed',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Orders] Approval error:', error);
    res.status(500).json({ error: 'Failed to approve order' });
  } finally {
    client.release();
  }
});

// ============================================================
// PUT /api/orders/:id/cancel
// Cancel an order and refund escrow if applicable
// ============================================================
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const client = await db.getClient();

  try {
    const { id } = req.params;

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Only buyer or seller can cancel
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this order' });
    }

    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'This order cannot be cancelled' });
    }

    await client.query('BEGIN');

    // If funds are in escrow, process refund
    if (order.status === 'in_escrow') {
      await client.query(
        `UPDATE escrow_transactions SET status = 'refunded', refunded_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
        [id]
      );
      // In production: Trigger payment gateway to refund buyer's mobile wallet
    }

    // Update order status
    await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Make product available again
    await client.query(
      `UPDATE products SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [order.product_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Order cancelled successfully. Product is now available.',
      orderStatus: 'cancelled',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Orders] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

// ============================================================
// PUT /api/orders/:id/dispute
// Raise a dispute on an order
// ============================================================
router.put('/:id/dispute', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (order.status !== 'in_escrow') {
      return res.status(400).json({ error: 'Only escrow orders can be disputed' });
    }

    await db.query(
      `UPDATE orders SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await db.query(
      `UPDATE escrow_transactions SET status = 'disputed' WHERE order_id = $1`,
      [id]
    );

    res.json({
      message: 'Dispute raised. Admin will review and resolve.',
      reason,
      orderStatus: 'disputed',
    });
  } catch (error) {
    console.error('[Orders] Dispute error:', error);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// ============================================================
// GET /api/orders/my-orders
// Get current user's orders (both buying and selling)
// ============================================================
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { type = 'all', status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let whereClause = '';
    const params = [req.user.id];

    if (type === 'buying') {
      whereClause = 'o.buyer_id = $1';
    } else if (type === 'selling') {
      whereClause = 'o.seller_id = $1';
    } else {
      whereClause = '(o.buyer_id = $1 OR o.seller_id = $1)';
    }

    if (status) {
      whereClause += ` AND o.status = $2`;
      params.push(status);
    }

    const result = await db.query(
      `SELECT 
         o.*,
         p.title AS product_title,
         p.price AS product_price,
         p.campus_location,
         (SELECT pi.image_url FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS product_image,
         buyer.full_name AS buyer_name,
         seller.full_name AS seller_name
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), offset]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('[Orders] My orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============================================================
// GET /api/orders/:id
// Get single order with full details
// ============================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
         o.*,
         p.title AS product_title,
         p.description AS product_description,
         p.condition AS product_condition,
         p.campus_location,
         buyer.full_name AS buyer_name,
         buyer.phone AS buyer_phone,
         buyer.university AS buyer_university,
         seller.full_name AS seller_name,
         seller.phone AS seller_phone,
         seller.university AS seller_university,
         et.status AS escrow_status,
         et.gateway_reference,
         (SELECT pi.image_url FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS product_image
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       LEFT JOIN escrow_transactions et ON et.order_id = o.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Check authorization: only buyer, seller, or admin can view
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }

    res.json({ order });
  } catch (error) {
    console.error('[Orders] Get single error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

module.exports = router;
