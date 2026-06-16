/*
 * UniDrop Marketplace - Main Server Entry Point
 * 
 * This is the main Express application file that:
 * - Configures middleware (CORS, JSON parsing, static files)
 * - Mounts all API route handlers
 * - Starts the HTTP server
 * 
 * Architecture: Express.js with modular route handlers
 * Best Practice: Separation of concerns - routes are in separate modules
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const escrowRoutes = require('./routes/escrowRoutes');
const advertisementRoutes = require('./routes/advertisementRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// --- Stripe Webhook (must be BEFORE express.json()) ---
// Stripe requires the raw request body for signature verification
app.post('/api/payments/webhook', express.raw({ type: '*/*' }), (req, res) => {
  const { verifyWebhook } = require('./config/stripe');
  let event;
  try {
    const signature = req.headers['stripe-signature'];
    // convert Buffer to string if needed for Stripe signature verification
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
    event = verifyWebhook(rawBody, signature);
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  console.log(`[Stripe] Webhook received: ${event.type}`);
  res.json({ received: true });
});

// --- Middleware Configuration ---

// Enable Cross-Origin Resource Sharing for frontend communication
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory for product images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'UniDrop Marketplace API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// --- Mount API Routes ---

// Authentication routes: login, register, verify student ID
app.use('/api/auth', authRoutes);

// User management routes: profile, dashboard
app.use('/api/users', userRoutes);

// Product management routes: CRUD, search, filter
app.use('/api/products', productRoutes);

// Order management routes: buy, reserve, approve, history
app.use('/api/orders', orderRoutes);

// Escrow transaction routes: release funds, refund
app.use('/api/escrow', escrowRoutes);

// Advertisement routes: banners, promotions
app.use('/api/advertisements', advertisementRoutes);

// Category routes: listing categories
app.use('/api/categories', categoryRoutes);

// File upload routes: product images
app.use('/api/upload', uploadRoutes);

// Stripe payment routes: create intent, confirm, release, refund
app.use('/api/payments', paymentRoutes);

// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  
  // Handle multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'Image must be less than 5MB',
    });
  }

  // Handle JWT authentication errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please login again',
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// --- 404 Not Found Handler ---
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`[UniDrop] Server running on http://localhost:${PORT}`);
  console.log(`[UniDrop] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[UniDrop] "Campus Trade Made Safe and Easy"`);
});

module.exports = app;
