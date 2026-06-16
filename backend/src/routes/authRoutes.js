/*
 * UniDrop Marketplace - Authentication Routes & Controller
 * 
 * Handles user authentication:
 * - POST /register - New student registration
 * - POST /login - User login with JWT
 * - POST /verify-student - Submit student ID verification
 * - GET /me - Get current authenticated user profile
 * 
 * Security: Passwords hashed with bcrypt (12 salt rounds).
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// POST /api/auth/register
// Register a new student account
// ============================================================
router.post('/register', [
  // Input validation
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('university').trim().notEmpty().withMessage('University name is required'),
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, phone, password, university, studentId } = req.body;

    // Check if user already exists with same email or phone
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Account exists',
        message: 'A user with this email or phone number already exists',
      });
    }

    // Hash password with bcrypt (12 salt rounds for security)
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new user into database
    const result = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, university, student_id, role) 
       VALUES ($1, $2, $3, $4, $5, $6, 'buyer') 
       RETURNING id, full_name, email, phone, university, student_id, role, is_verified, created_at`,
      [fullName, email, phone, passwordHash, university, studentId]
    );

    const user = result.rows[0];

    // Generate JWT token valid for 7 days
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, university: user.university },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Registration successful. Please verify your student ID.',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        university: user.university,
        studentId: user.student_id,
        role: user.role,
        isVerified: user.is_verified,
      },
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ============================================================
// POST /api/auth/login
// Authenticate existing user and return JWT token
// ============================================================
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    const user = result.rows[0];

    // Compare password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, university: user.university },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        university: user.university,
        studentId: user.student_id,
        role: user.role,
        isVerified: user.is_verified,
        campusLocation: user.campus_location,
        profileImageUrl: user.profile_image_url,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ============================================================
// GET /api/auth/me
// Get current authenticated user's profile
// ============================================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, full_name, email, phone, university, student_id, role, is_verified, 
              campus_location, profile_image_url, created_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        university: user.university,
        studentId: user.student_id,
        role: user.role,
        isVerified: user.is_verified,
        campusLocation: user.campus_location,
        profileImageUrl: user.profile_image_url,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('[Auth] Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================================
// POST /api/auth/verify-student
// Submit student ID verification request (simplified)
// ============================================================
router.post('/verify-student', authenticateToken, async (req, res) => {
  try {
    const { verificationDocumentUrl } = req.body;

    await db.query(
      `UPDATE users SET verification_document_url = $1 WHERE id = $2`,
      [verificationDocumentUrl, req.user.id]
    );

    res.json({
      message: 'Verification document submitted successfully. Pending review.',
    });
  } catch (error) {
    console.error('[Auth] Verification error:', error);
    res.status(500).json({ error: 'Verification submission failed' });
  }
});

module.exports = router;
