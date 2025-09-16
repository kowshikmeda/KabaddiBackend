const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  getUserProfile,
  getUserDetails,
  updateUser,
  getUserCreatedMatches,
  getUserPlayedMatches
} = require('../controllers/userController');
const upload = require('../config/cloudinary');

const router = express.Router();

// Validation middleware for user update
const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('about')
    .optional()
    .isLength({ max: 500 })
    .withMessage('About cannot exceed 500 characters'),
  body('height')
    .optional()
    .isNumeric()
    .withMessage('Height must be a number'),
  body('weight')
    .optional()
    .isNumeric()
    .withMessage('Weight must be a number'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters')
];

// Routes
router.get('/all', getAllUsers);
router.get('/user/created-matches',authMiddleware, getUserCreatedMatches);
router.get('/user/played-matches', authMiddleware,getUserPlayedMatches);
router.get('/user/:playerId', getUserById);
router.get('/user/:playerId/profile', getUserProfile);
router.get('/userdetails/:userId', getUserDetails);
router.put('/user/update/:userId', authMiddleware, upload.single("photo"),updateUserValidation, updateUser);


module.exports = router;




 