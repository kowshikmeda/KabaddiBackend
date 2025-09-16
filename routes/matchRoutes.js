const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const {
  getAllMatches,
  createMatch,
  updateMatchStatus
} = require('../controllers/matchController');
const upload = require('../config/cloudinary');

const router = express.Router();

// Validation middleware for match creation
const createMatchValidation = [
  body('team1Name')
    .trim()
    .notEmpty()
    .withMessage('Team 1 name is required')
    .isLength({ max: 50 })
    .withMessage('Team name cannot exceed 50 characters'),
  body('team2Name')
    .trim()
    .notEmpty()
    .withMessage('Team 2 name is required')
    .isLength({ max: 50 })
    .withMessage('Team name cannot exceed 50 characters'),
  body('matchDate')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Match date cannot be in the past');
      }
      return true;
    }),
  body('venue')
    .trim()
    .notEmpty()
    .withMessage('Venue is required')
    .isLength({ max: 100 })
    .withMessage('Venue cannot exceed 100 characters'),
  body('totalDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total time must be at least 1 minute')
]; 

// Routes
router.get('/all', getAllMatches);
router.post('/create', authMiddleware,  upload.fields([
    { name: 'team1Photo', maxCount: 1 },
    { name: 'team2Photo', maxCount: 1 }
  ]), createMatchValidation, createMatch);
router.put('/match/:actionType/:matchId/:currentUserId', authMiddleware, updateMatchStatus);

module.exports = router;