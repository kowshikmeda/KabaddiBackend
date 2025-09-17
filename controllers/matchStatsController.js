const MatchStats = require('../models/MatchStats');
const Match = require('../models/Match');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { emitMatchUpdated, emitNewCommentary } = require('../services/matchRealtimeService');
const Commentary = require('../models/Commentary');

// @desc    Get scorecard summary
// @route   GET /api/scorecard/:matchId
// @access  Public
const getScorecardSummary = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const matchStats = await MatchStats.findOne({ matchId })
      .populate('matchId')
      .populate('team1.playerId', 'name email')
      .populate('team2.playerId', 'name email');
    
    if (!matchStats) {
      return res.status(404).json({
        success: false,
        message: 'Match stats not found'
      });
    }

    // Calculate team totals
    const team1TotalRaid = matchStats.team1.reduce((sum, player) => sum + player.raidPoints, 0);
    const team1TotalTackle = matchStats.team1.reduce((sum, player) => sum + player.tacklePoints, 0);
    const team2TotalRaid = matchStats.team2.reduce((sum, player) => sum + player.raidPoints, 0);
    const team2TotalTackle = matchStats.team2.reduce((sum, player) => sum + player.tacklePoints, 0);

    const summary = {
      match: matchStats.matchId,
      team1Name: matchStats.team1Name,
      team2Name: matchStats.team2Name,
      team1Stats: {
        totalRaidPoints: team1TotalRaid,
        totalTacklePoints: team1TotalTackle,
        totalPoints: team1TotalRaid + team1TotalTackle,
        playerCount: matchStats.team1.length
      },
      team2Stats: {
        totalRaidPoints: team2TotalRaid,
        totalTacklePoints: team2TotalTackle,
        totalPoints: team2TotalRaid + team2TotalTackle,
        playerCount: matchStats.team2.length
      }
    };
    
    res.status(200).json({
      success: true,
      message: 'Scorecard summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving scorecard summary',
      error: error.message
    });
  }
};

// @desc    Get full match stats
// @route   GET /api/matchstats/match/scorecard/:id
// @access  Public

const getFullMatchStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const matchStats = await MatchStats.findOne({ matchId: id })
      .populate('matchId') // This contains status, remainingDuration, matchStartTime
      .populate('team1.playerId', 'name email photo')
      .populate('team2.playerId', 'name email photo');
    
    if (!matchStats) {
      return res.status(404).json({
        success: false,
        message: 'Match stats not found'
      }); 
    }

    // --- REAL-TIME DURATION CALCULATION LOGIC ---
    
    // Create a plain JavaScript object to modify before sending the response
    const responseData = matchStats.toObject();
    const match = responseData.matchId; // A shortcut to the nested match document
    
    let needsDatabaseUpdate = false; // A flag to check if we need to save changes

    // This logic runs ONLY if the match is currently live
    if (match.status === 'live' && match.matchStartTime) {
      const now = new Date();
      // Calculate the seconds elapsed since the current "live" segment started
      const elapsedSeconds = Math.round((now - new Date(match.matchStartTime)) / 1000);
      
      // Calculate the true remaining duration
      let currentRemainingDuration = match.remainingDuration - elapsedSeconds;

      // Sanity Check 1: If the timer has run out, the match is over.
      if (currentRemainingDuration <= 0) {
        currentRemainingDuration = 0;
        match.status = 'completed'; // Update the status in our response object
        needsDatabaseUpdate = true; // Flag that we need to save this change to the DB
      }
      
      // Update the remaining duration in our response object
      match.remainingDuration = currentRemainingDuration;
    }

    // Sanity Check 2: If the stored duration is negative for any reason, fix it.
    if (match.remainingDuration < 0) {
        match.remainingDuration = 0;
        if (match.status !== 'completed') {
            match.status = 'completed';
            needsDatabaseUpdate = true;
        }
    }

    // If any of our checks determined the match should be completed, update the database.
    // This is a "self-healing" mechanism for matches whose timers run out.
    if (needsDatabaseUpdate) {
      await Match.findByIdAndUpdate(match._id, {
        status: 'completed',
        remainingDuration: 0
      });
    }
    
    // --- END OF CALCULATION LOGIC ---
    
    res.status(200).json({
      success: true,
      message: 'Full match stats retrieved successfully',
      data: responseData // Send the modified object with the real-time duration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving full match stats',
      error: error.message
    });
  }
};

// @desc    Get live scorecard
// @route   GET /api/matchstats/match/livescorecard/:matchId
// @access  Private (requires userId in cookies)

const getLiveScorecard = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Authentication check remains the same
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for live scorecard'
      });
    }
    
    const matchStats = await MatchStats.findOne({ matchId })
      .populate('matchId') // Contains status, remainingDuration, matchStartTime
      .populate('team1.playerId', 'name')
      .populate('team2.playerId', 'name');
    
    if (!matchStats) {
      return res.status(404).json({
        success: false,
        message: 'Match stats not found'
      });
    }

    // --- REAL-TIME DURATION CALCULATION LOGIC (Identical to getFullMatchStats) ---
    
    // Create a plain JavaScript object to modify before sending the response
    const responseData = matchStats.toObject();
    const match = responseData.matchId;
    
    let needsDatabaseUpdate = false; // Flag to check if we need to save changes

    // This logic runs ONLY if the match is currently live
    if (match.status === 'live' && match.matchStartTime) {
      const now = new Date();
      // Calculate the seconds elapsed since the current "live" segment started
      const elapsedSeconds = Math.round((now - new Date(match.matchStartTime)) / 1000);
      
      // Calculate the true remaining duration
      let currentRemainingDuration = match.remainingDuration - elapsedSeconds;

      // If the timer has run out, the match is over.
      if (currentRemainingDuration <= 0) {
        currentRemainingDuration = 0;
        match.status = 'completed'; // Update the status in our response object
        needsDatabaseUpdate = true; // Flag that we need to save this change to the DB
      }
      
      // Update the remaining duration in our response object
      match.remainingDuration = currentRemainingDuration;
    }

    // If any check determined the match should be completed, update the database.
    if (needsDatabaseUpdate) {
      await Match.findByIdAndUpdate(match._id, {
        status: 'completed',
        remainingDuration: 0
      });
    }
    
    // --- END OF CALCULATION LOGIC ---
    
    res.status(200).json({
      success: true,
      message: 'Live scorecard retrieved successfully',
      data: responseData // Send the modified object with the real-time duration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving live scorecard',
      error: error.message
    });
  }
};

// @desc    Update match stats
// @route   PUT /api/matchstats/match/:matchId/update/:currentUserID
// @access  Private
// REWRITTEN CONTROLLER
const updateMatchStats = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { matchId, currentUserID } = req.params;
    // This is the new payload from your frontend
    const { playerId, pointType, points, teamName } = req.body;

    // --- 1. Find Match Stats and Authorize ---
    const matchStats = await MatchStats.findOne({ matchId }).populate('matchId');
    if (!matchStats) {
      return res.status(404).json({ success: false, message: 'Match stats not found' });
    }

    const match = matchStats.matchId;
    if (match.createdBy.toString() !== currentUserID) {
      return res.status(403).json({ success: false, message: 'Not authorized to update these match stats' });
    }

    // --- 2. Find the Player and Determine Their Team ---
    let playerToUpdate = null;
    let teamScoreFieldToUpdate = null; // This will be 'team1Score' or 'team2Score'

    // Search in team1
    playerToUpdate = matchStats.team1.find(p => p.playerId.toString() === playerId);
    if (playerToUpdate) {
      teamScoreFieldToUpdate = 'team1Score';
    } else {
      // If not in team1, search in team2
      playerToUpdate = matchStats.team2.find(p => p.playerId.toString() === playerId);
      if (playerToUpdate) {
        teamScoreFieldToUpdate = 'team2Score';
      }
    }
    
    // For point types that are NOT raid or tackle, we determine the team from the payload
    if (!teamScoreFieldToUpdate && teamName) {
        if (teamName === matchStats.team1Name) teamScoreFieldToUpdate = 'team1Score';
        if (teamName === matchStats.team2Name) teamScoreFieldToUpdate = 'team2Score';
    }

    // --- 3. Apply Points Based on Game Logic ---
    switch (pointType) {
      case 'RAID_POINT':
        if (!playerToUpdate) {
          return res.status(404).json({ success: false, message: 'Player not found in this match' });
        }
        playerToUpdate.raidPoints += points;
        break;

      case 'TACKLE_POINT':
        if (!playerToUpdate) {
          return res.status(404).json({ success: false, message: 'Player not found in this match' });
        }
        playerToUpdate.tacklePoints += points;
        break;

      // For these types, points go directly to the team, not a player's personal stats
      case 'BONUS_POINT':
      case 'TECHNICAL_POINT':
      case 'ALL_OUT_POINT':
        if (!teamScoreFieldToUpdate) {
            return res.status(400).json({ success: false, message: 'Could not determine which team to award points to.' });
        }
        // No player stats are changed, we just proceed to update the team score
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid point type' });
    }

    // --- 4. Atomically Update Both Models in the Database ---

    // A. Update the overall match score in the 'Match' document
    // Using $inc is atomic and safe for simultaneous updates
    await Match.findByIdAndUpdate(matchId, {
      $inc: { [teamScoreFieldToUpdate]: points }
    });

    // B. Save the changes to the player's stats in the 'MatchStats' document
    await matchStats.save();
    
    // --- 5. Populate and Return the Updated Data ---
    const populatedStats = await MatchStats.findById(matchStats._id)
      .populate('matchId')
      .populate('team1.playerId', 'name')
      .populate('team2.playerId', 'name');
     // Emit realtime score update
  
    const updatedMatch = await Match.findById(matchId).lean();

    const matchUpdatedPayload = {
      id: updatedMatch._id,
      matchName: `${updatedMatch.team1Name} vs ${updatedMatch.team2Name}`,
      team1: {
        name: updatedMatch.team1Name,
        photo: updatedMatch.team1Photo || `https://ui-avatars.com/api/?name=${updatedMatch.team1Name.split(' ').join('+')}&background=random`,
        score: updatedMatch.team1Score
      },
      team2: {
        name: updatedMatch.team2Name,
        photo: updatedMatch.team2Photo || `https://ui-avatars.com/api/?name=${updatedMatch.team2Name.split(' ').join('+')}&background=random`,
        score: updatedMatch.team2Score
      },
      status: updatedMatch.status.toUpperCase(),
      remainingDuration: updatedMatch.remainingDuration,
      venue: updatedMatch.venue,
      date: updatedMatch.matchDate,
      players: {
        team1: populatedStats.team1.map(p => ({
          id: p.playerId._id,
          name: p.playerId.name,
          raidPoints: p.raidPoints,
          tacklePoints: p.tacklePoints
        })),
        team2: populatedStats.team2.map(p => ({
          id: p.playerId._id,
          name: p.playerId.name,
          raidPoints: p.raidPoints,
          tacklePoints: p.tacklePoints
        }))
      }
    };
    // Store live commentary line
    if(points>0){
      let commentaryLine = '';
let playername=await User.findById(playerToUpdate.playerId).select('name');

switch (pointType) {
  case 'RAID_POINT':
    commentaryLine = `${teamName} scored raid points by player ${playername.name} ${points} points.`;
    break;

  case 'TACKLE_POINT':
    commentaryLine = `${teamName} scored tackle points by player ${playername.name} ${points} points.`;
    break;

  case 'BONUS_POINT':
    commentaryLine = `${teamName} scored a bonus point. +${points} points.`;
    break;

  case 'TECHNICAL_POINT':
    commentaryLine = `${teamName} awarded a technical point. +${points} points.`;
    break;

  case 'ALL_OUT_POINT':
    commentaryLine = `${teamName} scored an all-out point! +${points} points.`;
    break;

  default:
    commentaryLine = `Point scored.`;
}

await Commentary.create({
  matchId,
  commentary: commentaryLine,
  createdAt: new Date(),
});
    
const newCommentaryPayload = {
  matchId,
  commentary: commentaryLine,
  createdAt: new Date(),
};

emitNewCommentary(newCommentaryPayload);
    }

   
    // ⚡ Emit a single event
    emitMatchUpdated(matchUpdatedPayload);

    res.status(200).json({
      success: true,
      message: 'Match stats updated successfully',
      data: populatedStats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating match stats',
      error: error.message
    });
  }
};

module.exports = {
  getScorecardSummary,
  getFullMatchStats,
  getLiveScorecard,
  updateMatchStats
};