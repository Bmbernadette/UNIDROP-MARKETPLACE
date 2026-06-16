/*
 * UniDrop Marketplace - JWT Authentication Middleware
 * 
 * This middleware:
 * - Extracts JWT token from the Authorization header
 * - Verifies the token validity and expiration
 * - Attaches the decoded user payload to req.user for downstream handlers
 * 
 * Security Best Practice: Validates token on every protected route request.
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 * Expected header format: Authorization: Bearer <token>
 */
const authenticateToken = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no token provided, return 401 Unauthorized
  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No authentication token provided. Please login.',
    });
  }

  // Verify the JWT token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Token expired or invalid
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired. Please login again.',
      });
    }

    // Attach decoded user info to request object
    // decoded contains: { id, email, role, university }
    req.user = decoded;
    next();
  });
};

/**
 * Middleware to restrict access to specific user roles.
 * Must be used AFTER authenticateToken middleware.
 * 
 * @param {...string} roles - List of allowed roles (e.g., 'admin', 'seller')
 * Usage: router.get('/admin', authenticateToken, authorize('admin'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
};
