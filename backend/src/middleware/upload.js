/*
 * UniDrop Marketplace - File Upload Middleware
 * 
 * Configures multer for handling product image uploads.
 * 
 * Features:
 * - Restricts file types to images only (jpg, jpeg, png, webp)
 * - Limits file size to 5MB
 * - Stores files in the /uploads directory with unique names
 * 
 * Best Practice: Validates file types on server-side, not just client-side.
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Define allowed image MIME types for validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// Configure multer disk storage
const storage = multer.diskStorage({
  // Set upload destination directory
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  // Generate unique filename using UUID to prevent collisions
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `product_${uniqueSuffix}${extension}`);
  },
});

// File filter: only allow image files
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Create and export multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB default
    files: 5, // Maximum 5 images per upload
  },
});

module.exports = upload;
