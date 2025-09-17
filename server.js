// server.js

const http = require('http');
const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/database');
const {initializeSocket} = require('./utils/socket'); // import socket.js

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;

// Create an HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
