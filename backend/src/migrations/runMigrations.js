/*
 * UniDrop Marketplace - Database Migration Script
 * 
 * This script creates all database tables required for the platform.
 * Run with: npm run migrate
 * 
 * Tables:
 * 1. users - Student accounts with verification status
 * 2. categories - Product classification (Textbooks, Electronics, etc.)
 * 3. products - Items listed for sale by students
 * 4. product_images - Multiple images per product listing
 * 5. orders - Purchase transactions between buyers and sellers
 * 6. escrow_transactions - Payment holding/release tracking
 * 7. reviews - Buyer/seller ratings and feedback
 * 8. advertisements - Campus business banner ads
 * 9. premium_listings - Paid boosted product listings
 * 
 * Best Practice: Uses IF NOT EXISTS for idempotent migrations.
 */

const { pool } = require('../config/database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // ============================================================
    // 1. USERS TABLE
    // Stores all platform users (students, admins)
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        university VARCHAR(150) NOT NULL,
        student_id VARCHAR(50),
        role VARCHAR(20) DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_document_url VARCHAR(500),
        profile_image_url VARCHAR(500),
        campus_location VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 2. CATEGORIES TABLE
    // Product categories for organizing listings
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 3. PRODUCTS TABLE
    // Individual product listings created by sellers
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
        condition VARCHAR(20) NOT NULL CHECK (condition IN ('brand_new', 'like_new', 'well_used')),
        campus_location VARCHAR(200) NOT NULL,
        meeting_point VARCHAR(300),
        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'hidden')),
        is_premium BOOLEAN DEFAULT FALSE,
        view_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 4. PRODUCT IMAGES TABLE
    // Multiple images per product (up to 5)
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 5. ORDERS TABLE
    // Purchase transactions with full escrow lifecycle tracking
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
        commission_fee DECIMAL(12, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'in_escrow', 'delivered', 'completed', 'cancelled', 'disputed')),
        meeting_point VARCHAR(300),
        meeting_time TIMESTAMP,
        buyer_approved BOOLEAN DEFAULT FALSE,
        payment_reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 6. ESCROW TRANSACTIONS TABLE
    // Tracks the lifecycle of funds held in escrow
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS escrow_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
        status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed')),
        payment_method VARCHAR(50),
        gateway_reference VARCHAR(255),
        released_at TIMESTAMP,
        refunded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 7. REVIEWS TABLE
    // Buyer/seller ratings after completed transactions
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 8. ADVERTISEMENTS TABLE
    // Paid banner ads from local campus businesses
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_name VARCHAR(200) NOT NULL,
        banner_image_url VARCHAR(500) NOT NULL,
        target_campus VARCHAR(200),
        link_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 9. PREMIUM LISTINGS TABLE
    // Tracks paid boosted listings
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS premium_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL,
        payment_reference VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // Create indexes for query performance optimization
    // ============================================================
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_campus ON products(campus_location);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_premium ON products(is_premium) WHERE is_premium = true;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON reviews(reviewed_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_escrow_order ON escrow_transactions(order_id);`);

    await client.query('COMMIT');
    console.log('[Migration] All tables created successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Error creating tables:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration and exit
createTables()
  .then(() => {
    console.log('[Migration] Database migration completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Migration] Migration failed:', err.message);
    process.exit(1);
  });
