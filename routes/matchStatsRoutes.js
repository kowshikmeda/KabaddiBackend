const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const {
  getScorecardSummary,
  getFullMatchStats,
  getLiveScorecard,
  updateMatchStats
} = require('../controllers/matchStatsController');

const router = express.Router();

// Validation middleware for updating match stats
const updateStatsValidation = [
  body('team1Players')
    .optional()
    .isArray()
    .withMessage('Team1 players must be an array'),
  body('team1Players.*.userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('team1Players.*.raidPoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Raid points must be a non-negative integer'),
  body('team1Players.*.tacklePoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Tackle points must be a non-negative integer'),
  body('team2Players')
    .optional()
    .isArray()
    .withMessage('Team2 players must be an array'),
  body('team2Players.*.userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('team2Players.*.raidPoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Raid points must be a non-negative integer'),
  body('team2Players.*.tacklePoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Tackle points must be a non-negative integer'),
  body('team1Score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Team1 score must be a non-negative integer'),
  body('team2Score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Team2 score must be a non-negative integer')
];

// Routes
router.get('/match/scorecard/:id', getFullMatchStats);
router.get('/match/livescorecard/:matchId', authMiddleware, getLiveScorecard);
router.put('/match/:matchId/update/:currentUserID', authMiddleware, updateStatsValidation, updateMatchStats);

module.exports = router;