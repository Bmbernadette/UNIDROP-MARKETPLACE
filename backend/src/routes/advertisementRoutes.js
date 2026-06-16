/*
 * UniDrop Marketplace - Advertisement Routes & Controller
 * 
 * Manages hyper-local campus business advertisements:
 * - GET  /active    - Get active ads (optionally filtered by campus)
 * - POST /          - Create new advertisement (admin only)
 * - PUT  /:id       - Update advertisement (admin only)
 * - DELETE /:id     - Remove advertisement (admin only)
 * 
 * Revenue Stream: External businesses pay for targeted campus banner ads.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /api/advertisements/active
// Get active advertisements, optionally filtered by campus
// ============================================================
router.get('/active', async (req, res) => {
  try {
    const { campus } = req.query;

    let query = `SELECT * FROM advertisements WHERE is_active = true AND start_date <= CURRENT_TIMESTAMP AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)`;
    const params = [];

    if (campus) {
      query += ` AND (target_campus IS NULL OR target_campus ILIKE $1)`;
      params.push(`%${campus}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT 10`;

    const result = await db.query(query, params);

    res.json({ advertisements: result.rows });
  } catch (error) {
    console.error('[Ads] List error:', error);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
});

// ============================================================
// POST /api/advertisements
// Create a new advertisement (admin only per BUSINESS CONCEPT)
// ============================================================
router.post('/', authenticateToken, authorize('admin'), [
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('bannerImageUrl').trim().notEmpty().withMessage('Banner image URL is required'),
  body('targetCampus').optional().trim(),
  body('linkUrl').optional().trim(),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { businessName, bannerImageUrl, targetCampus, linkUrl, endDate } = req.body;

    const result = await db.query(
      `INSERT INTO advertisements (business_name, banner_image_url, target_campus, link_url, end_date) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [businessName, bannerImageUrl, targetCampus || null, linkUrl || null, endDate || null]
    );

    res.status(201).json({
      message: 'Advertisement created successfully',
      advertisement: result.rows[0],
    });
  } catch (error) {
    console.error('[Ads] Create error:', error);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
});

// ============================================================
// PUT /api/advertisements/:id
// Update an advertisement (admin only)
// ============================================================
router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { businessName, bannerImageUrl, targetCampus, linkUrl, isActive, endDate } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (businessName) { updates.push(`business_name = $${paramIndex}`); params.push(businessName); paramIndex++; }
    if (bannerImageUrl) { updates.push(`banner_image_url = $${paramIndex}`); params.push(bannerImageUrl); paramIndex++; }
    if (targetCampus !== undefined) { updates.push(`target_campus = $${paramIndex}`); params.push(targetCampus); paramIndex++; }
    if (linkUrl !== undefined) { updates.push(`link_url = $${paramIndex}`); params.push(linkUrl); paramIndex++; }
    if (isActive !== undefined) { updates.push(`is_active = $${paramIndex}`); params.push(isActive); paramIndex++; }
    if (endDate) { updates.push(`end_date = $${paramIndex}`); params.push(endDate); paramIndex++; }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await db.query(
      `UPDATE advertisements SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...params, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    res.json({
      message: 'Advertisement updated successfully',
      advertisement: result.rows[0],
    });
  } catch (error) {
    console.error('[Ads] Update error:', error);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
});

// ============================================================
// DELETE /api/advertisements/:id
// Delete an advertisement (admin only)
// ============================================================
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM advertisements WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('[Ads] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
});

module.exports = router;
