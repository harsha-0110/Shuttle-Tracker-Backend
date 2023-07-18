const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Sample shuttle data (replace this with real data from your database or other sources)
let shuttles = [
  { id: 1, latitude: 37.7749, longitude: -122.4194 },
  { id: 2, latitude: 37.7755, longitude: -122.4182 },
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
