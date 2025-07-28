const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { AtomicSwapDemoEmitter } = require('./demos/finp2p-atomic-swap-coordination-demo');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('start-demo', () => {
    const demo = new AtomicSwapDemoEmitter();
    demo.on('progress', (data) => {
      socket.emit('progress', data);
    });
    demo.on('error', (data) => {
      socket.emit('error', data);
    });
    demo.runDemo();
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 