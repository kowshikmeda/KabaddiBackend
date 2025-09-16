const mongoose = require('mongoose');

const playerStatsSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  raidPoints: {
    type: Number,
    default: 0,
    min: [0, 'Raid points cannot be negative']
  },
  tacklePoints: {
    type: Number,
    default: 0,
    min: [0, 'Tackle points cannot be negative']
  }
}, { _id: false });

const matchStatsSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: [true, 'Match ID is required'],
    unique: true
  },
  team1Name: {
    type: String,
    required: [true, 'Team 1 name is required'],
    trim: true
  },
  team2Name: {
    type: String,
    required: [true, 'Team 2 name is required'],
    trim: true
  },
  team1: [playerStatsSchema],
  team2: [playerStatsSchema]
}, {
  timestamps: true
});

// Index for better query performance
matchStatsSchema.index({ matchId: 1 });

module.exports = mongoose.model('MatchStats', matchStatsSchema);