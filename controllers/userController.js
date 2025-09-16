const User = require('../models/User');
const Match = require('../models/Match');
const MatchStats = require('../models/MatchStats');
const { validationResult } = require('express-validator');

// @desc    Get all users
// @route   GET /api/users/all
// @access  Public
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("_id name").sort({ createdAt: -1 });
      
      const transformedPlayers = users.map(user => ({
        playerId:user._id,
        playerName:user.name
       
      }));
      
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
     
      data: transformedPlayers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: error.message
    });
  }
};

// @desc    Get user details by ID
// @route   GET /api/users/user/:playerId
// @access  Public
const getUserById = async (req, res) => {
  try {
    const { playerId } = req.params;

    const user = await User.findById(playerId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        about: user.about || "",
        photo: user.photo || "",
        height: user.height || 0,
        weight: user.weight || 0,
        location: user.location || "",
        debut: user.debut || null,
        age: user.age || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user',
      error: error.message
    });
  }
};


// @desc    Get user profile info
// @route   GET /api/users/user/:playerId/profile
// @access  Public
const getUserProfile = async (req, res) => {
  try {
    const { playerId } = req.params;

    const user = await User.findById(playerId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get last 5 matches player participated in
    const lastMatchesStats = await MatchStats.find({
      $or: [
        { 'team1.playerId': playerId },
        { 'team2.playerId': playerId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('matchId');

    const lastFiveMatches = lastMatchesStats.map(matchStat => {
      const isTeam1 = matchStat.team1.some(p => p.playerId.toString() === playerId);
      const playerData = (isTeam1 ? matchStat.team1 : matchStat.team2).find(p => p.playerId.toString() === playerId);

      const match = matchStat.matchId;
      const oppositeTeam = isTeam1 ? matchStat.team2 : matchStat.team1;
      const oppositeTeamName = isTeam1 ? matchStat.team2Name : matchStat.team1Name;

      const teamScore = isTeam1 ? matchStat.team1.reduce((acc, p) => acc + p.raidPoints + p.tacklePoints, 0)
                                : matchStat.team2.reduce((acc, p) => acc + p.raidPoints + p.tacklePoints, 0);
      const oppositeScore = isTeam1 ? matchStat.team2.reduce((acc, p) => acc + p.raidPoints + p.tacklePoints, 0)
                                    : matchStat.team1.reduce((acc, p) => acc + p.raidPoints + p.tacklePoints, 0);

      const totalPoints = playerData.raidPoints + playerData.tacklePoints;
      let performance = 'average';
      if (totalPoints >= 15) performance = 'excellent';
      else if (totalPoints >= 10) performance = 'good';
      else if (totalPoints < 5) performance = 'poor';

      return {
        date: match.matchDate.toISOString().split('T')[0],
        opponent: oppositeTeamName,
        venue: match.venue,
        result: teamScore > oppositeScore ? "Won" : "Lost",
        score: `${teamScore}-${oppositeScore}`,
        playerPoints: totalPoints,
        raidPoints: playerData.raidPoints,
        tacklePoints: playerData.tacklePoints,
        performance
      };
    });

    // Compute career stats
    const allMatchesStats = await MatchStats.find({
      $or: [
        { 'team1.playerId': playerId },
        { 'team2.playerId': playerId }
      ]
    });

    let totalPoints = 0, raidPoints = 0, tacklePoints = 0;
    allMatchesStats.forEach(matchStat => {
      const playerData = matchStat.team1.find(p => p.playerId.toString() === playerId) ||
                         matchStat.team2.find(p => p.playerId.toString() === playerId);
      if (playerData) {
        raidPoints += playerData.raidPoints;
        tacklePoints += playerData.tacklePoints;
        totalPoints += playerData.raidPoints + playerData.tacklePoints;
      }
    });

    const profileData = {
      id: user._id,
      name: user.name,
      about: user.about || "",
      photo: user.photo || "",
      height: user.height || 0,
      weight: user.weight || 0,
      location: user.location || "",
      debut: user.debut || null,
      age: user.age || null,
      careerStats: {
        totalMatches: allMatchesStats.length,
        totalPoints,
        raidPoints,
        tacklePoints,
        averagePoints: allMatchesStats.length > 0 ? (totalPoints / allMatchesStats.length).toFixed(1) : 0,
        raidSuccessRate: totalPoints > 0 ? ((raidPoints / totalPoints) * 100).toFixed(1) : 0
      },
      lastFiveMatches
    };

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: profileData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: error.message
    });
  }
};


// @desc    Get user details (duplicate endpoint)
// @route   GET /api/users/userdetails/:userId
// @access  Public
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user details',
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/user/update/:userId
// @access  Private
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    
    // --- FIX 1: Destructure the new fields from the request body ---
    const { name, about, height, weight, location, age, phone } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if authenticated user can update this profile
    // Note: Ensure req.user.id is correctly set by your auth middleware
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    // --- FIX 2: Build the update object dynamically ---
    // This is a cleaner way to handle optional fields.
    const updateFields = {};
    if (name) updateFields.name = name;
    if (about !== undefined) updateFields.about = about;
    if (height) updateFields.height = height;
    if (weight) updateFields.weight = weight;
    if (location !== undefined) updateFields.location = location;
   
    if (age) updateFields.age = age;
    if (phone) updateFields.phone = phone;


     if (req.file) {
      updateFields.photo = req.file.path; // The URL from Cloudinary is in req.file.path
    }

    // Update user using the dynamically built object
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields }, // Use $set for safer updates
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from the returned document
    
    if (!updatedUser) {
        return res.status(404).json({ success: false, message: "Update failed, user not found." });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    // Provide more specific error feedback for unique field violations
    if (error.code === 11000) { // MongoDB duplicate key error
        return res.status(400).json({
            success: false,
            message: `The phone number '${error.keyValue.phone}' is already in use.`
        });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc    Get matches created by user
// @route   GET /api/users/user/:userId/created-matches
// @access  Public
const getUserCreatedMatches = async (req, res) => {
  try {
    const  userId  = req.user._id;
    
    const matches = await Match.find({ createdBy: userId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: 'User created matches retrieved successfully',
      count: matches.length,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user created matches',
      error: error.message
    });
  }
};

// @desc    Get matches where user played
// @route   GET /api/users/user/:userId/played-matches
// @access  Public
const getUserPlayedMatches = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user._id; // ✅ use authenticated user ID

    // Find match stats where user played
    const matchStats = await MatchStats.find({
      $or: [
        { 'team1.playerId': userId },
        { 'team2.playerId': userId }
      ]
    }).populate('matchId');

    const matches = matchStats
      .map(stat => stat.matchId)
      .filter(Boolean);

    res.status(200).json({
      success: true,
      message: 'User played matches retrieved successfully',
      count: matches.length,
      data: matches
    });

  } catch (error) {
    console.error("Error fetching played matches:", error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user played matches',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserProfile,
  getUserDetails,
  updateUser,
  getUserCreatedMatches,
  getUserPlayedMatches
};