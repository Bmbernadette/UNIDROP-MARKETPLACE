/*
 * UniDrop Marketplace - User Routes & Controller
 * 
 * Handles user profile and dashboard operations:
 * - GET  /profile/:id    - Get public user profile
 * - PUT  /profile        - Update own profile
 * - GET  /dashboard      - Get user dashboard data (listings, orders, stats)
 * - GET  /reviews/:id    - Get reviews for a user
 * - POST /reviews        - Submit a review after completed transaction
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /api/users/profile/:id
// Get public profile of any user
// ============================================================
router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, full_name, university, is_verified, profile_image_url, campus_location, created_at 
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get active listings count
    const listingsCount = await db.query(
      'SELECT COUNT(*) FROM products WHERE seller_id = $1 AND status = $2',
      [id, 'available']
    );

    // Get user reviews
    const reviewsResult = await db.query(
      `SELECT r.*, rev.full_name AS reviewer_name 
       FROM reviews r 
       JOIN users rev ON r.reviewer_id = rev.id 
       WHERE r.reviewed_id = $1 
       ORDER BY r.created_at DESC 
       LIMIT 10`,
      [id]
    );

    // Calculate average rating
    const avgRating = await db.query(
      'SELECT AVG(rating)::numeric(2,1) AS average_rating, COUNT(*) AS total_reviews FROM reviews WHERE reviewed_id = $1',
      [id]
    );

    res.json({
      user: {
        ...user,
        activeListings: parseInt(listingsCount.rows[0].count, 10),
        averageRating: avgRating.rows[0].average_rating || 0,
        totalReviews: parseInt(avgRating.rows[0].total_reviews, 10),
      },
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    console.error('[Users] Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================================
// PUT /api/users/profile
// Update authenticated user's profile
// ============================================================
router.put('/profile', authenticateToken, [
  body('fullName').optional().trim().notEmpty(),
  body('phone').optional().trim().notEmpty(),
  body('campusLocation').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, phone, campusLocation } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (fullName) { updates.push(`full_name = $${paramIndex}`); params.push(fullName); paramIndex++; }
    if (phone) { updates.push(`phone = $${paramIndex}`); params.push(phone); paramIndex++; }
    if (campusLocation) { updates.push(`campus_location = $${paramIndex}`); params.push(campusLocation); paramIndex++; }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.user.id);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, full_name, email, phone, university, campus_location, is_verified`,
      params
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('[Users] Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================================
// GET /api/users/dashboard
// Get authenticated user's dashboard summary data
// ============================================================
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active listings count
    const activeListings = await db.query(
      'SELECT COUNT(*) FROM products WHERE seller_id = $1 AND status = $2',
      [userId, 'available']
    );

    // Get sold items count
    const soldItems = await db.query(
      'SELECT COUNT(*) FROM orders WHERE seller_id = $1 AND status = $2',
      [userId, 'completed']
    );

    // Get active orders as buyer
    const activeOrders = await db.query(
      `SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND status IN ('pending', 'paid', 'in_escrow')`,
      [userId]
    );

    // Get recent orders
    const recentOrders = await db.query(
      `SELECT o.*, p.title AS product_title, p.price AS product_price,
              (SELECT pi.image_url FROM product_images pi 
               WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS product_image,
              CASE 
                WHEN o.buyer_id = $1 THEN seller.full_name 
                ELSE buyer.full_name 
              END AS other_party_name
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE (o.buyer_id = $1 OR o.seller_id = $1)
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get user's active product listings
    const userListings = await db.query(
      `SELECT p.*, c.name AS category_name,
              (SELECT pi.image_url FROM product_images pi 
               WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.seller_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      stats: {
        activeListings: parseInt(activeListings.rows[0].count, 10),
        soldItems: parseInt(soldItems.rows[0].count, 10),
        activeOrders: parseInt(activeOrders.rows[0].count, 10),
      },
      recentOrders: recentOrders.rows,
      myListings: userListings.rows,
    });
  } catch (error) {
    console.error('[Users] Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================================
// GET /api/users/reviews/:id
// Get reviews for a specific user
// ============================================================
router.get('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT r.*, rev.full_name AS reviewer_name, rev.profile_image_url AS reviewer_image,
              o.product_id, p.title AS product_title
       FROM reviews r
       JOIN users rev ON r.reviewer_id = rev.id
       JOIN orders o ON r.order_id = o.id
       JOIN products p ON o.product_id = p.id
       WHERE r.reviewed_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    const avgResult = await db.query(
      'SELECT AVG(rating)::numeric(2,1) AS average_rating, COUNT(*) AS total_reviews FROM reviews WHERE reviewed_id = $1',
      [id]
    );

    res.json({
      reviews: result.rows,
      averageRating: avgResult.rows[0].average_rating || 0,
      totalReviews: parseInt(avgResult.rows[0].total_reviews, 10),
    });
  } catch (error) {
    console.error('[Users] Reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ============================================================
// POST /api/users/reviews
// Submit a review after a completed transaction
// ============================================================
router.post('/reviews', authenticateToken, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    // Verify order exists and is completed
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND status = $2',
      [orderId, 'completed']
    );

    if (orderResult.rows.length === 0) {
      return res.status(400).json({ error: 'Can only review completed orders' });
    }

    const order = orderResult.rows[0];

    // Determine who is being reviewed (the other party)
    const reviewedId = order.buyer_id === reviewerId ? order.seller_id : order.buyer_id;

    // Check if review already exists for this order by this user
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE reviewer_id = $1 AND order_id = $2',
      [reviewerId, orderId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this order' });
    }

    // Insert review
    const result = await db.query(
      `INSERT INTO reviews (reviewer_id, reviewed_id, order_id, rating, comment) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [reviewerId, reviewedId, orderId, rating, comment || null]
    );

    res.status(201).json({
      message: 'Review submitted successfully',
      review: result.rows[0],
    });
  } catch (error) {
    console.error('[Users] Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
