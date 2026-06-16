/*
 * UniDrop Marketplace - Escrow Routes & Controller
 * 
 * Manages escrow transaction operations:
 * - GET /status/:orderId - Check escrow status for an order
 * 
 * The main escrow operations (create, release, refund) are tightly integrated
 * with the Orders controller since they form part of the order lifecycle.
 * This route provides standalone escrow query endpoints.
 */

const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /api/escrow/status/:orderId
// Get escrow transaction status for a specific order
// ============================================================
router.get('/status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await db.query(
      `SELECT * FROM escrow_transactions WHERE order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No escrow transaction found',
        message: 'This order has no associated escrow transaction',
      });
    }

    res.json({ escrowTransaction: result.rows[0] });
  } catch (error) {
    console.error('[Escrow] Status error:', error);
    res.status(500).json({ error: 'Failed to fetch escrow status' });
  }
});

// ============================================================
// GET /api/escrow/history
// Get escrow transaction history for the authenticated user
// ============================================================
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT 
         et.*,
         o.id AS order_id,
         o.buyer_id,
         o.seller_id,
         o.amount AS order_amount,
         p.title AS product_title,
         buyer.full_name AS buyer_name,
         seller.full_name AS seller_name
       FROM escrow_transactions et
       JOIN orders o ON et.order_id = o.id
       JOIN products p ON o.product_id = p.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE o.buyer_id = $1 OR o.seller_id = $1
       ORDER BY et.created_at DESC`,
      [userId]
    );

    res.json({ escrowHistory: result.rows });
  } catch (error) {
    console.error('[Escrow] History error:', error);
    res.status(500).json({ error: 'Failed to fetch escrow history' });
  }
});

module.exports = router;
