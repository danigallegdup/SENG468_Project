/**
 * server.js
 */
const express = require('express');
const mongoose = require('mongoose');  // <-- MongoDB stuff (need to swap/alter)
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// ------------------------------------------------------------------
// Mongoose user model (example)
// ------------------------------------------------------------------
const userSchema = new mongoose.Schema({
  user_name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: false }
});

const User = mongoose.model('User', userSchema);

// ------------------------------------------------------------------
// TODO:
// 
// REGISTER Endpoint
//
// Request Body Example:
// {
//   "user_name":"VanguardETF",
//   "password":"Vang@123",
//   "name":"Vanguard Corp."
// }
// 
// Response (success): { "success": true, "data": null }
// Response (error):   { "success": false, "error": "<errorMessage>" }
// ------------------------------------------------------------------
app.post('/register', async (req, res) => {
  try {
    const { user_name, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ user_name });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      user_name,
      password: hashedPassword,
      name
    });
    await newUser.save();

    return res.json({
      success: true,
      data: null
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ------------------------------------------------------------------
// TODO:
//
// LOGIN Endpoint
//
// Request Body Example:
// {
//   "user_name":"VanguardETF",
//   "password":"Vang@123"
// }
//
// Response (success): 
// {
//   "success": true,
//   "data": { "token": "<compToken>" }
// }
// 
// Response (error):
// {
//   "success": false,
//   "error": "<errorMessage>"
// }
// ------------------------------------------------------------------
app.post('/login', async (req, res) => {
  try {
    const { user_name, password } = req.body;

    const user = await User.findOne({ user_name });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token (replace "SECRET_KEY" with a real secret)
    const token = jwt.sign(
      { userId: user._id, user_name: user.user_name },
      'SECRET_KEY',
      { expiresIn: '1h' }
    );

    return res.json({
      success: true,
      data: {
        token
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ------------------------------------------------------------------
// Connect to MongoDB (example). Need to sync with Ian again to 
// ensure we do this right
// ------------------------------------------------------------------
mongoose.connect('mongodb://localhost:27017/exampleDb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  // Start server only after successful DB connection
  app.listen(3000, () => console.log('Server running on port 3000'));
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
