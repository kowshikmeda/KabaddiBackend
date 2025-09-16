// socket.js
const { Server } = require("socket.io");

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL, // frontend URL
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔗 User Connected: ${socket.id}`);

    // --- Join a specific match room ---
    socket.on("joinMatchRoom", (matchId) => {
      socket.join(matchId);
      console.log(`👥 User ${socket.id} joined room for match ${matchId}`);
    });

    // --- Leave a match room ---
    socket.on("leaveMatchRoom", (matchId) => {
      socket.leave(matchId);
      console.log(`👤 User ${socket.id} left room for match ${matchId}`);
    });

    // (Optional) Listen for manual refresh requests from clients
    socket.on("requestScorecardRefresh", (matchId) => {
      io.to(matchId).emit("scorecardUpdated");
       io.to('match-list-updates').emit('matchListShouldRefresh');
      console.log(`🔄 Scorecard refresh triggered for match ${matchId}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User Disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initializeSocket;
