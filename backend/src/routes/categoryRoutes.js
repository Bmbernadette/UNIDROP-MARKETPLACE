/*
 * UniDrop Marketplace - Category Routes & Controller
 * 
 * Handles product category operations:
 * - GET / - List all active categories
 * - GET /:slug - Get category details with product count
 */

const express = require('express');
const db = require('../config/database');

const router = express.Router();

// ============================================================
// GET /api/categories
// List all active product categories
// ============================================================
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'available') AS product_count
       FROM categories c 
       WHERE c.is_active = true 
       ORDER BY c.display_order ASC`
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('[Categories] List error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================
// GET /api/categories/:slug
// Get a single category by its URL slug
// ============================================================
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'available') AS product_count
       FROM categories c 
       WHERE c.slug = $1 AND c.is_active = true`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('[Categories] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

module.exports = router;
