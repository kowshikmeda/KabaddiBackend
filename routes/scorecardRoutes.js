const express = require('express');
const { getScorecardSummary } = require('../controllers/matchStatsController');

const router = express.Router();

// GET /api/scorecard/:matchId
router.get('/:matchId', getScorecardSummary);

module.exports = router;