const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');
const upload = require('../config/cloudinary');
const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('height')
    .optional()
    .isNumeric()
    .withMessage('Height must be a number'),
  body('weight')
    .optional()
    .isNumeric()
    .withMessage('Weight must be a number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes
router.post('/register', upload.single('photo'),registerValidation, register);
router.post('/login', loginValidation, login);

module.exports = router;