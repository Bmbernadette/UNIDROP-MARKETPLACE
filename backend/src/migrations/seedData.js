/*
 * UniDrop Marketplace - Seed Data Script
 * 
 * Populates the database with initial category data and sample records.
 * Run with: npm run seed
 * 
 * Best Practice: Seeds data AFTER migration to ensure tables exist.
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const seedData = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ============================================================
    // Seed product categories relevant to campus life
    // ============================================================
    console.log('[Seed] Inserting product categories...');

    const categories = [
      { name: 'Textbooks & Notes', slug: 'textbooks-notes', description: 'Academic textbooks, lecture notes, and study materials', icon: '📚', display_order: 1 },
      { name: 'Electronics', slug: 'electronics', description: 'Laptops, tablets, smartphones, and accessories', icon: '💻', display_order: 2 },
      { name: 'Furniture & Dorm', slug: 'furniture-dorm', description: 'Mattresses, beds, desks, chairs, and fans', icon: '🛏️', display_order: 3 },
      { name: 'Kitchen & Appliances', slug: 'kitchen-appliances', description: 'Gas cookers, blenders, kettles, and kitchenware', icon: '🍳', display_order: 4 },
      { name: 'Drawing & Art Tools', slug: 'drawing-art-tools', description: 'Drawing instruments, engineering tools, and art supplies', icon: '✏️', display_order: 5 },
      { name: 'Clothing & Accessories', slug: 'clothing-accessories', description: 'Clothes, shoes, bags, and fashion accessories', icon: '👕', display_order: 6 },
      { name: 'Sports & Fitness', slug: 'sports-fitness', description: 'Sports equipment, gym gear, and fitness items', icon: '⚽', display_order: 7 },
      { name: 'Services', slug: 'services', description: 'Tutoring, printing, graphic design, and other services', icon: '🛠️', display_order: 8 },
      { name: 'Other', slug: 'other', description: 'Miscellaneous items that do not fit other categories', icon: '📦', display_order: 9 },
    ];

    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (name, slug, description, icon, display_order) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (slug) DO UPDATE SET name = $1, description = $3`,
        [cat.name, cat.slug, cat.description, cat.icon, cat.display_order]
      );
    }

    // ============================================================
    // Seed a demo admin user
    // ============================================================
    console.log('[Seed] Creating demo admin user...');

    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminId = uuidv4();
    
    await client.query(
      `INSERT INTO users (id, full_name, email, phone, password_hash, university, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'UniDrop Admin', 'admin@unidrop.co.tz', '+255000000000', adminPassword, 'UDSM', 'admin', true]
    );

    // ============================================================
    // Seed sample advertisements from campus businesses
    // ============================================================
    console.log('[Seed] Inserting sample advertisements...');

    const ads = [
      { business_name: 'Campus Print Hub', target_campus: 'UDSM', link_url: 'https://example.com/print', start_date: new Date(), end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { business_name: 'Hostel Booking TZ', target_campus: 'DIT', link_url: 'https://example.com/hostel', start_date: new Date(), end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    ];

    for (const ad of ads) {
      await client.query(
        `INSERT INTO advertisements (business_name, banner_image_url, target_campus, link_url, start_date, end_date) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ad.business_name, '/uploads/banner-placeholder.jpg', ad.target_campus, ad.link_url, ad.start_date, ad.end_date]
      );
    }

    await client.query('COMMIT');
    console.log('[Seed] Seed data inserted successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Seed] Error seeding data:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Run seed and exit
seedData()
  .then(() => {
    console.log('[Seed] Database seeding completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Seed] Seeding failed:', err.message);
    process.exit(1);
  });
