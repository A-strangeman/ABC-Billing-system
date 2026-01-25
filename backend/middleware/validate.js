// ============================================
// VALIDATION MIDDLEWARE - Input Sanitization
// backend/middleware/validate.js
// ============================================

const { body, param, query, validationResult } = require('express-validator');

// ============================================
// VALIDATE REQUEST - Check for errors
// ============================================
function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
}

// ============================================
// VALIDATION RULES
// ============================================

const loginRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['admin', 'cashier', 'viewer'])
    .withMessage('Invalid role')
];

const billRules = [
  body('estimateNo')
    .isInt({ min: 1 })
    .withMessage('Invoice number must be a positive integer'),
  
  body('date')
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('customer.name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ max: 200 })
    .withMessage('Customer name too long'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('total')
    .isFloat({ min: 0 })
    .withMessage('Total must be a positive number')
];

const categoryRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name too long')
];

const searchRules = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long')
];

const mongoIdRules = [
  param('id')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid ID format')
];

// Helper to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  validate,
  loginRules,
  registerRules,
  billRules,
  categoryRules,
  searchRules,
  mongoIdRules,
  escapeRegex
};
