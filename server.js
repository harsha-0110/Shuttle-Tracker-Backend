const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to your MongoDB database
mongoose.connect('mongodb://localhost:27017/shuttle', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const calculatePrice = (distance) => {
  const baseFare = 5.0;
  const maxFare = 20.0;
  const pricePerKilometer = 10;
  let price = distance * pricePerKilometer;
  price = Math.max(price, baseFare);
  price = Math.min(price, maxFare);
  return parseFloat(price.toFixed(2));
};

// Define a Location schema and model
const locationSchema = new mongoose.Schema({
  id: String,
  name: String,
  latitude: Number,
  longitude: Number,
  status: String,
  totalDistance: Number,
  timestamp: { type: Date, default: Date.now },
});

const Location = mongoose.model('Location', locationSchema);

// Define a User schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  trips: [
    {
      shuttleId: String,
      action: String,
      distance: Number,
      startdist:Number,
      price: Number,
    },
  ],
});

const User = mongoose.model('User', userSchema);

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Function to convert degrees to radians
const deg2rad = (deg) => deg * (Math.PI / 180);

// Route to receive location data from the Flutter app
app.post('/api/locations', async (req, res) => {
  try {
    const { id, name, latitude, longitude, status } = req.body;

    // Find a Location document with the given ID
    const existingLocation = await Location.findOne({ id });

    if (existingLocation) {
      const { latitude: existingLat, longitude: existingLon } = existingLocation;
      const distance = calculateDistance(existingLat, existingLon, latitude, longitude);
      existingLocation.totalDistance += distance;
      existingLocation.name = name;
      existingLocation.latitude = latitude;
      existingLocation.longitude = longitude;
      existingLocation.status = status;
      await existingLocation.save();
    } else {
      const location = new Location({
        id,
        name,
        latitude,
        longitude,
        status,
        totalDistance: 0,
      });
      await location.save();
    }

    res.status(201).json({ message: 'Location saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to get all shuttle data from the MongoDB location collection
app.get('/shuttle', async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User Registration
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();

  res.status(200).json({ message: 'User registered successfully' });
});

// User Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });
  res.status(200).json({ token });
});

// Start a trip
app.post('/start-trip', async (req, res) => {
  try {
    const { data, username } = req.body;
    const obj = JSON.parse(data);
    const action = obj.action;
    const shuttleId = obj.shuttleId;
    const id = obj.shuttleId;
    const user = await User.findOne({ username });
    const td = await Location.findOne({ id });

    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'User not found' });
    }

    if (action === 'start') {
      // Fetch the last location of the shuttle with the provided shuttleId
      const lastLocation = await Location.findOne({ id });

      if (!lastLocation) {
        console.log('Shuttle location not found');
        return res.status(400).json({ message: 'Shuttle location not found' });
      }

      const newTrip = {
        shuttleId,
        action,
        distance: 0,
        startdist: lastLocation.totalDistance,
        price: 0, // Initialize price to 0
      };

      user.trips.push(newTrip);
      await user.save();

      res.status(200).json({ message: 'Trip started' });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/end-trip', async (req, res) => {
  try {
    const { data, username } = req.body;
    const obj = JSON.parse(data);
    const action = obj.action;
    const shuttleId = obj.shuttleId;
    const id = obj.shuttleId;
    const user = await User.findOne({ username });

    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'User not found' });
    }

    if (action === 'end') {
      // Fetch the last location of the shuttle with the provided shuttleId
      const lastLocation = await Location.findOne({ id });

      if (!lastLocation) {
        console.log('Shuttle location not found');
        return res.status(400).json({ message: 'Shuttle location not found' });
      }

      const lastTrip = user.trips[user.trips.length - 1];

      if (lastTrip && lastTrip.action === 'start' && lastTrip.shuttleId === shuttleId) {
        const distance = lastLocation.totalDistance - lastTrip.startdist;
        const roundedDistance = parseFloat(distance.toFixed(2)); // Round to 2 decimal places

        const price = Math.round(calculatePrice(roundedDistance));

        lastTrip.action = 'end';
        lastTrip.distance = roundedDistance;
        lastTrip.price = price;

        await user.save();

        res.status(200).json({ message: 'Trip ended', price: price, distance: roundedDistance });
      } else {
        res.status(400).json({ message: 'No matching trip found' });
      }
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to get trip history for a specific user
app.get('/trip-history/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Assuming 'trips' is an array of trip history in the user schema
    const tripHistory = user.trips || [];

    res.status(200).json(tripHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
