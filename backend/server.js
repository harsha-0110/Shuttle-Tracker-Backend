const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Sample shuttle data (replace this with real data from your database or other sources)
let shuttles = [
  { id: 1, latitude: 12.9747120, longitude: 79.1589742 },
  { id: 2, latitude: 12.9718872, longitude: 79.1740519 },
  // Add more shuttle data as needed
];

io.on('connection', (socket) => {
  console.log('Client connected');

  // Emit shuttle location updates to the connected client every 5 seconds (for demonstration purposes)
  setInterval(() => {
    socket.emit('shuttleLocationUpdate', shuttles);
  }, 5000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const port = 3000; // Replace with your desired port number
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
