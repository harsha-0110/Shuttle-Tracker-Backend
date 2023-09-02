const express = require('express');
const app = express();
const port = 3000; // You can choose a different port

// Middleware to parse JSON requests
app.use(express.json());

// Sample shuttle data (replace with your data source)
const shuttles = [
  { id: '1', name: 'MB - Mens hostel', latitude: 12.972730, longitude: 79.160510, status: 'Vacant' },
  { id: '2', name: 'SJT - MB', latitude: 12.972537, longitude: 79.160328, status: 'Full' },
];

// Endpoint to get all shuttle data
app.get('/shuttle', (req, res) => {
  res.json(shuttles);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
