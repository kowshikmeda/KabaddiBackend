require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
 const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const matchStatsRoutes = require('./routes/matchStatsRoutes');
const scorecardRoutes = require('./routes/scorecardRoutes');
const app = express();

// Middleware
app.use(cors({
  origin:  [  "https://kabaddi-fd.vercel.app" , "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/matchstats', matchStatsRoutes);

// // Scorecard route (separate endpoint as per requirements)
 app.use('/api/scorecard',scorecardRoutes);

// // Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Kabaddi Backend API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: ['/api/auth/register', '/api/auth/login'],
      users: [
        '/api/users/all',
        '/api/users/user/:playerId',
        '/api/users/user/:playerId/profile',
        '/api/users/userdetails/:userId',
        '/api/users/user/update/:userId',
        '/api/users/user/:userId/created-matches',
        '/api/users/user/:userId/played-matches'
      ],
      matches: [
        '/api/matches/all',
        '/api/matches/create',
        '/api/matches/match/:actionType/:matchId/:currentUserID'
      ],
      matchStats: [
        '/api/matchstats/match/scorecard/:id',
        '/api/matchstats/match/livescorecard/:matchId',
        '/api/matchstats/match/:matchId/update/:currentUserID'
      ],
      scorecard: ['/api/scorecard/:matchId']
    }
  });
 });

// Error handling middleware
app.use(errorHandler);

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;