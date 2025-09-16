const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  team1Name: {
    type: String,
    required: [true, 'Team 1 name is required'],
    trim: true,
    maxlength: [50, 'Team name cannot exceed 50 characters']
  },
  team2Name: {
    type: String,
    required: [true, 'Team 2 name is required'],
    trim: true,
    maxlength: [50, 'Team name cannot exceed 50 characters']
  },
  team1Score: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative']
  },
  team2Score: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative']
  },
  team1Photo: {
    type: String,
    default: null
  },
  team2Photo: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['upcoming', 'live', 'paused', 'completed'],
      message: 'Status must be upcoming, live, paused, or completed'
    },
    default: 'upcoming' // It's good practice to have a default
  },
  matchDate: {
    type: Date,
    required: [true, 'Match date is required']
    // Note: The validation for past dates might be better handled in the controller if you need to edit old matches.
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true,
    maxlength: [100, 'Venue cannot exceed 100 characters']
  },
  totalDuration: {
    type: Number,
    default: 40, // 40 minutes default
    min: [1, 'Total time must be at least 1 minute']
  },

  // --- NEW AND UPDATED FIELDS ---

  remainingDuration: {
    type: Number, // Stores the remaining playable time in SECONDS
   
    min: [0, 'Remaining duration cannot be negative']
  },

  matchStartTime: {
    type: Date, // Timestamp for when the match status first becomes 'live'
    default: null
  },

  matchPauseTime: {
    type: Date, // Timestamp for when the match status becomes 'paused'
    default: null
  },
  
 

}, {
  timestamps: true
});

// Indexes remain the same
matchSchema.index({ createdBy: 1, matchDate: -1 });
matchSchema.index({ status: 1, matchDate: -1 });

module.exports = mongoose.model('Match', matchSchema);