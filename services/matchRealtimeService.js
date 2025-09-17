let ioInstance = null;

function setSocketInstance(io) {
  ioInstance = io;
}


// server/controllers/matchController.js
const emitMatchUpdated = (payload) => {
  if (ioInstance) { // make sure your ioInstance is your Socket.IO server
    ioInstance.emit('matchUpdated', payload);
    //console.log('Emitted matchUpdated:', payload);
  }
};

const emitNewCommentary = (payload) => {
  if (ioInstance) { // make sure your ioInstance is your Socket.IO server
    ioInstance.emit('NewCommentary', payload);
   // console.log('Emitted new commentary:', payload);
  }
};

module.exports = {
  setSocketInstance,
  emitMatchUpdated,
  emitNewCommentary
};
