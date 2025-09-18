const { Server } = require('socket.io');
const { setSocketInstance } = require('../services/matchRealtimeService');

function initializeSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', 
      methods: ['GET', 'POST'], 
      credentials: true },
       transports: ['websocket', 'polling'], // Allow both transports
  });

  setSocketInstance(io);

  io.on('connection', (socket) => {
   // console.log(`User connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`User disconnected: ${socket.id}`));
  });

  return io;
}

module.exports = { initializeSocket };
