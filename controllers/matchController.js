const Match = require('../models/Match');
const MatchStats = require('../models/MatchStats');
const { validationResult } = require('express-validator');
const {  emitMatchUpdated } = require('../services/matchRealtimeService');
const Commentary = require('../models/Commentary');
// @desc    Get all matches
// @route   GET /api/matches/all
// @access  Public

const getAllMatches = async (req, res) => {
  try {
    const { status, createdBy, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (createdBy) query.createdBy = createdBy;
    
    // 1. Fetch the matches from the database as usual
    const matchesFromDB = await Match.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Use .lean() for performance; it returns plain JS objects

    // --- REAL-TIME DURATION CALCULATION FOR THE ENTIRE LIST ---
    
    const now = new Date(); // Get the current time once to use for all calculations

    // 2. Process the array to calculate real-time values
    const processedMatches = matchesFromDB.map(match => {
      // This logic runs ONLY if a match is currently live
      if (match.status === 'live' && match.matchStartTime) {
        // Calculate the seconds elapsed since this match's "live" segment started
        const elapsedSeconds = Math.round((now - new Date(match.matchStartTime)) / 1000);
        
        // Calculate the true remaining duration
        let currentRemainingDuration = match.remainingDuration - elapsedSeconds;

        // If the timer has run out, modify the object for the response
        if (currentRemainingDuration <= 0) {
          match.remainingDuration = 0;
          match.status = 'completed'; // Send the correct status to the frontend
        } else {
          match.remainingDuration = currentRemainingDuration;
        }
      }
      return match;
    });

    // --- END OF CALCULATION LOGIC ---

    const total = await Match.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: 'Matches retrieved successfully',
      count: processedMatches.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: processedMatches // 3. Send the processed array with real-time data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving matches',
      error: error.message
    });
  }
};

// @desc    Create new match
// @route   POST /api/matches/create
// @access  Private

const createMatch = async (req, res) => {
  try {
    // 1. Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // 2. Destructure data from request body
    const {
      team1Name,
      team2Name,
      matchDate,
      venue,
      totalDuration,
      team1Players,
      team2Players
    } = req.body;

    // 3. Prepare the data object for creating the Match
    const durationInMinutes = totalDuration || 40;
    const matchData = {
      team1Name,
      team2Name,
      matchDate: new Date(matchDate),
      venue,
      totalDuration: durationInMinutes,
      remainingDuration: durationInMinutes * 60, // Correctly calculate seconds
      createdBy: req.user.id, // Assumes authMiddleware adds user to req
      status: "upcoming",
    };

    // 4. Check for uploaded files and add their URLs to the data object
    // This is the key fix: populate the object BEFORE creating the document.
    if (req.files) {
      if (req.files.team1Photo && req.files.team1Photo[0]) {
        matchData.team1Photo = req.files.team1Photo[0].path;
      }
      if (req.files.team2Photo && req.files.team2Photo[0]) {
        matchData.team2Photo = req.files.team2Photo[0].path;
      }
    }

    // 5. Create the Match document using the complete data object
    const match = await Match.create(matchData);

    // 6. Create the associated MatchStats document
    const team1 = (team1Players || []).map(playerId => ({
      playerId,
      raidPoints: 0,
      tacklePoints: 0
    }));

    const team2 = (team2Players || []).map(playerId => ({
       playerId,
      raidPoints: 0,
      tacklePoints: 0
    }));

    const stats = await MatchStats.create({
      matchId: match._id,
      team1Name,
      team2Name,
      team1,
      team2
    });

    // 7. Populate and send the successful response
    const populatedMatch = await Match.findById(match._id).populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: { populatedMatch, stats }
    });

  } catch (error) {
    console.error("Error creating match:", error); // Log the full error for debugging
    res.status(500).json({
      success: false,
      message: 'Error creating match',
      error: error.message
    });
  }
};


// @desc    Update match status
// @route   PUT /api/matches/match/:actionType/:matchId/:currentUserID
// @access  Private


const updateMatchStatus = async (req, res) => {
  try {
    const { actionType, matchId, currentUserId } = req.params;

    const validActions = ['start', 'pause', 'resume', 'end'];
    if (!validActions.includes(actionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action type. Must be start, pause, resume, or end'
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Your authorization logic remains the same
    if (match.createdBy.toString() !== currentUserId && req.user.id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this match'
      });
    }

    let updateData = {};
    const now = new Date(); // Use a single timestamp for all calculations in this request

    switch (actionType) {
      // Requirement 1: Starting the match
      case 'start':
        if (match.status !== 'upcoming') {
          return res.status(400).json({
            success: false,
            message: 'Match must be upcoming to start'
          });
        }
        updateData.status = 'live';
        // Set the start time, marking the beginning of the first "live" segment
        updateData.matchStartTime = now;
        break;

      // Requirement 2: Pausing the match
      case 'pause':
        if (match.status !== 'live') {
          return res.status(400).json({
            success: false,
            message: 'Match must be live to be paused'
          });
        }
        // Calculate the duration of the live segment that just ended
        const timeElapsedInSeconds = Math.round((now - match.matchStartTime) / 1000);

        // Subtract the consumed time from the remaining duration
        const newRemainingDuration = match.remainingDuration - timeElapsedInSeconds;
        
        updateData.status = 'paused';
        updateData.matchPauseTime = now; // Log the time of the pause
        // Ensure remaining duration doesn't go below zero
        updateData.remainingDuration = Math.max(0, newRemainingDuration);
        break;

      // Requirement 3: Resuming the match
      case 'resume':
        if (match.status !== 'paused') {
          return res.status(400).json({
            success: false,
            message: 'Match must be paused to be resumed'
          });
        }
        updateData.status = 'live';
        // Set a new start time for the beginning of the next "live" segment
        updateData.matchStartTime = now; 
        break;

      // Requirement 4: Ending the match
      case 'end':
        if (match.status !== 'live' && match.status !== 'paused') {
          return res.status(400).json({
            success: false,
            message: 'Match must be live or paused to be ended'
          });
        }
        
        // If the match was live when ended, calculate the final elapsed time
        if (match.status === 'live') {
            const finalTimeElapsed = Math.round((now - match.matchStartTime) / 1000);
            const finalRemainingDuration = match.remainingDuration - finalTimeElapsed;
            updateData.remainingDuration = Math.max(0, finalRemainingDuration);
        } else {
            // If it was paused, the duration is already calculated, just set to 0.
            updateData.remainingDuration = 0;
        }

        updateData.status = 'completed';
        updateData.matchPauseTime = now; // Log the final time
        // Override any calculation and set remaining duration to 0 as per the requirement
        updateData.remainingDuration = 0;
        break;
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      { $set: updateData }, // Use $set for safer updates
      { new: true, runValidators: true }
    );
    const populatedStats = await MatchStats.findOne({ matchId })
  .populate('team1.playerId', 'name')
  .populate('team2.playerId', 'name')
  .lean();


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

    // ⚡ Single unified emit
    emitMatchUpdated(matchUpdatedPayload);
    res.status(200).json({
      success: true,
      message: `Match status updated to ${updateData.status || match.status}`,
      data: updatedMatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error updating match status`,
      error: error.message
    });
  }
};

const getCommentary=async(req,res)=>{
  try {
    const { matchId } = req.params;

    // Fetch all commentaries for the match, sorted by createdAt descending (recent first)
    const commentaries = await Commentary.find({ matchId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: commentaries
    });
  } catch (error) {
    console.error('Error fetching commentary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commentary',
      error: error.message
    });
  }
} 

module.exports = {
  getAllMatches,
  createMatch,
  updateMatchStatus ,
  getCommentary
};