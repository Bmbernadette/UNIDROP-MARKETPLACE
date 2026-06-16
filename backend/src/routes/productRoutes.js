/*
 * UniDrop Marketplace - Product Routes & Controller
 * 
 * Handles all product listing operations:
 * - GET    /           - List all products with search, filter, sort, pagination
 * - GET    /:id        - Get single product with seller info and images
 * - POST   /           - Create new product listing (authenticated seller)
 * - PUT    /:id        - Update product listing
 * - DELETE /:id        - Delete product listing (owner only)
 * - GET    /featured   - Get premium/featured listings
 * - GET    /campus/:campus - Filter products by campus location
 * 
 * Best Practice: Pagination, filtering, and search built into list endpoint.
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ============================================================
// GET /api/products
// List products with search, filtering, sorting, and pagination
// Query params: search, campus, category, condition, minPrice, maxPrice, 
//               sortBy (price_asc, price_desc, newest, popular), page, limit
// ============================================================
router.get('/', async (req, res) => {
  try {
    const {
      search,
      campus,
      category,
      condition,
      minPrice,
      maxPrice,
      sortBy = 'newest',
      page = 1,
      limit = 20,
      premium,
    } = req.query;

    // Build dynamic WHERE clause based on provided filters
    const conditions = ['p.status = \'available\''];
    const params = [];
    let paramIndex = 1;

    // Search by title or description
    if (search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by campus location
    if (campus) {
      conditions.push(`p.campus_location ILIKE $${paramIndex}`);
      params.push(`%${campus}%`);
      paramIndex++;
    }

    // Filter by category slug
    if (category) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Filter by item condition
    if (condition) {
      conditions.push(`p.condition = $${paramIndex}`);
      params.push(condition);
      paramIndex++;
    }

    // Filter by price range
    if (minPrice) {
      conditions.push(`p.price >= $${paramIndex}`);
      params.push(parseFloat(minPrice));
      paramIndex++;
    }
    if (maxPrice) {
      conditions.push(`p.price <= $${paramIndex}`);
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    // Filter premium listings only
    if (premium === 'true') {
      conditions.push('p.is_premium = true');
    }

    // Determine sort order
    let orderBy = 'p.created_at DESC'; // default: newest first
    switch (sortBy) {
      case 'price_asc':
        orderBy = 'p.price ASC';
        break;
      case 'price_desc':
        orderBy = 'p.price DESC';
        break;
      case 'popular':
        orderBy = 'p.view_count DESC';
        break;
      case 'newest':
      default:
        orderBy = 'p.created_at DESC';
        break;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Get total count for pagination metadata
    const countResult = await db.query(
      `SELECT COUNT(*) FROM products p 
       JOIN categories c ON p.category_id = c.id 
       WHERE ${whereClause}`,
      params
    );
    const totalProducts = parseInt(countResult.rows[0].count, 10);

    // Get products with seller info, category, and primary image
    const productsResult = await db.query(
      `SELECT 
         p.*,
         u.full_name AS seller_name,
         u.university AS seller_university,
         u.is_verified AS seller_verified,
         c.name AS category_name,
         c.slug AS category_slug,
         (SELECT pi.image_url FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true 
          LIMIT 1) AS primary_image
       FROM products p
       JOIN users u ON p.seller_id = u.id
       JOIN categories c ON p.category_id = c.id
       WHERE ${whereClause}
       ORDER BY p.is_premium DESC, ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit, 10), offset]
    );

    res.json({
      products: productsResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error('[Products] List error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ============================================================
// GET /api/products/featured
// Get premium and featured product listings
// ============================================================
router.get('/featured', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
         p.*,
         u.full_name AS seller_name,
         u.university AS seller_university,
         c.name AS category_name,
         c.slug AS category_slug,
         (SELECT pi.image_url FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true 
          LIMIT 1) AS primary_image
       FROM products p
       JOIN users u ON p.seller_id = u.id
       JOIN categories c ON p.category_id = c.id
       WHERE p.is_premium = true AND p.status = 'available'
       ORDER BY p.created_at DESC
       LIMIT 10`
    );

    res.json({ products: result.rows });
  } catch (error) {
    console.error('[Products] Featured error:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// ============================================================
// GET /api/products/:id
// Get single product with all details, images, and seller info
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get product with seller and category info
    const productResult = await db.query(
      `SELECT 
         p.*,
         u.full_name AS seller_name,
         u.email AS seller_email,
         u.phone AS seller_phone,
         u.university AS seller_university,
         u.is_verified AS seller_verified,
         u.profile_image_url AS seller_image,
         c.name AS category_name,
         c.slug AS category_slug
       FROM products p
       JOIN users u ON p.seller_id = u.id
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    // Get all product images
    const imagesResult = await db.query(
      `SELECT * FROM product_images 
       WHERE product_id = $1 
       ORDER BY is_primary DESC, display_order ASC`,
      [id]
    );

    // Increment view count (non-blocking)
    db.query('UPDATE products SET view_count = view_count + 1 WHERE id = $1', [id])
      .catch(err => console.error('[Products] View count update error:', err));

    // Get seller's other active listings
    const otherListingsResult = await db.query(
      `SELECT p.id, p.title, p.price, p.condition, p.campus_location,
              (SELECT pi.image_url FROM product_images pi 
               WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
       FROM products p
       WHERE p.seller_id = $1 AND p.id != $2 AND p.status = 'available'
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [product.seller_id, id]
    );

    res.json({
      product,
      images: imagesResult.rows,
      otherListings: otherListingsResult.rows,
    });
  } catch (error) {
    console.error('[Products] Get single error:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// ============================================================
// POST /api/products
// Create a new product listing (requires authentication)
// ============================================================
router.post('/', authenticateToken, upload.array('images', 5), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('condition').isIn(['brand_new', 'like_new', 'well_used']).withMessage('Valid condition is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('campusLocation').trim().notEmpty().withMessage('Campus location is required'),
  body('meetingPoint').trim().notEmpty().withMessage('Meeting point is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, price, condition, categoryId, campusLocation, meetingPoint } = req.body;

    // Insert product into database
    const productResult = await db.query(
      `INSERT INTO products (seller_id, category_id, title, description, price, condition, campus_location, meeting_point) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [req.user.id, categoryId, title, description, parseFloat(price), condition, campusLocation, meetingPoint]
    );

    const product = productResult.rows[0];

    // Save uploaded images
    if (req.files && req.files.length > 0) {
      const imageValues = req.files.map((file, index) => ({
        productId: product.id,
        imageUrl: `/uploads/${file.filename}`,
        isPrimary: index === 0, // First image is primary
        displayOrder: index,
      }));

      for (const img of imageValues) {
        await db.query(
          `INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES ($1, $2, $3, $4)`,
          [img.productId, img.imageUrl, img.isPrimary, img.displayOrder]
        );
      }
    }

    res.status(201).json({
      message: 'Product listed successfully',
      product,
    });
  } catch (error) {
    console.error('[Products] Create error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// ============================================================
// PUT /api/products/:id
// Update an existing product listing (owner only)
// ============================================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, condition, campusLocation, meetingPoint, status } = req.body;

    // Verify product ownership
    const productCheck = await db.query('SELECT seller_id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (productCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }

    // Update only provided fields
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title) { updates.push(`title = $${paramIndex}`); params.push(title); paramIndex++; }
    if (description) { updates.push(`description = $${paramIndex}`); params.push(description); paramIndex++; }
    if (price) { updates.push(`price = $${paramIndex}`); params.push(parseFloat(price)); paramIndex++; }
    if (condition) { updates.push(`condition = $${paramIndex}`); params.push(condition); paramIndex++; }
    if (campusLocation) { updates.push(`campus_location = $${paramIndex}`); params.push(campusLocation); paramIndex++; }
    if (meetingPoint) { updates.push(`meeting_point = $${paramIndex}`); params.push(meetingPoint); paramIndex++; }
    if (status) { updates.push(`status = $${paramIndex}`); params.push(status); paramIndex++; }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...params, id]
    );

    res.json({
      message: 'Product updated successfully',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('[Products] Update error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ============================================================
// DELETE /api/products/:id
// Delete a product listing (owner only)
// ============================================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const productCheck = await db.query('SELECT seller_id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (productCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }

    await db.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: 'Product listing deleted successfully' });
  } catch (error) {
    console.error('[Products] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ============================================================
// GET /api/products/campus/:campus
// Get products filtered by specific campus location
// ============================================================
router.get('/campus/:campus', async (req, res) => {
  try {
    const { campus } = req.params;
    const result = await db.query(
      `SELECT 
         p.*,
         u.full_name AS seller_name,
         u.university AS seller_university,
         c.name AS category_name,
         c.slug AS category_slug,
         (SELECT pi.image_url FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
       FROM products p
       JOIN users u ON p.seller_id = u.id
       JOIN categories c ON p.category_id = c.id
       WHERE p.campus_location ILIKE $1 AND p.status = 'available'
       ORDER BY p.is_premium DESC, p.created_at DESC`,
      [`%${campus}%`]
    );

    res.json({ products: result.rows });
  } catch (error) {
    console.error('[Products] Campus filter error:', error);
    res.status(500).json({ error: 'Failed to fetch campus products' });
  }
});

module.exports = router;
