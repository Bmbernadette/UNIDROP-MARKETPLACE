/*
 * UniDrop Marketplace - File Upload Routes & Controller
 * 
 * Handles file upload operations:
 * - POST /images - Upload product images (supports up to 5 images)
 * 
 * Best Practice: Validates file types, sizes, and handles errors gracefully.
 */

const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ============================================================
// POST /api/upload/images
// Upload images for a product listing
// Expects: multipart/form-data with 'images' field and 'productId'
// ============================================================
router.post('/images', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const { productId } = req.body;

    // Verify product exists and belongs to the authenticated user
    if (productId) {
      const productCheck = await db.query(
        'SELECT seller_id FROM products WHERE id = $1',
        [productId]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (productCheck.rows[0].seller_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only upload images for your own products' });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Save image records to database
    const uploadedImages = [];
    for (const file of req.files) {
      const imageUrl = `/uploads/${file.filename}`;

      if (productId) {
        const result = await db.query(
          `INSERT INTO product_images (product_id, image_url, is_primary, display_order) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
          [productId, imageUrl, false, uploadedImages.length]
        );
        uploadedImages.push(result.rows[0]);
      } else {
        uploadedImages.push({ imageUrl, filename: file.filename });
      }
    }

    res.status(201).json({
      message: `${req.files.length} image(s) uploaded successfully`,
      images: uploadedImages,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// ============================================================
// POST /api/upload/single
// Upload a single file (for profile images, verification docs, etc.)
// ============================================================
router.post('/single', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('[Upload] Single error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
