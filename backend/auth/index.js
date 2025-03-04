/**
 * // backend/routes/authRoutes.js
 * // Routes for user authentication
 * 
 * @route   POST /api/auth/register
 * @route   POST /api/auth/login
 */

// routes/authRoutes.js
const express = require('express');
const User = require('./User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const cors = require("cors");
const connectDB = require("./db");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
dotenv.config();
connectDB();

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @body    { user_name, password, name }
 * @return  { success: true, data: null } on success,
 *          { success: false, data: { error: <errorMessage> } } on failure.
 */
app.post('/register', async (req, res) => {
  try {
    const { user_name, password, name } = req.body;

    if (!user_name || !password || !name) {
      return res.status(400).json({
        success: false,
        data: { error: 'All fields (user_name, password, name) are required' }
      });
    }

    const existingUser = await User.findOne({ username: user_name });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        data: { error: 'Username already exists' }
      });
    }

    // Create new user.
    // (Since the User model requires an email, we create a dummy email.)
    const newUser = new User({
      username: user_name,
      email: `${user_name}@dummy.com`,
      hashed_password: password,
    });

    await newUser.save();

    return res.status(201).json({ success: true, data: null });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({
      success: false,
      data: { error: "Server error during registration" },
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Log in an existing user
 * @body    { user_name, password }
 * @return  { success: true, data: { token } } on success,
 *          { success: false, data: { error: <errorMessage> } } on failure.
 */
app.post('/login', async (req, res) => {
  try {
    const { user_name, password } = req.body;

    if (!user_name || !password) {
      return res.status(400).json({
        success: false,
        data: { error: "Both user_name and password are required" },
      });
    }

    const user = await User.findOne({ username: user_name });
    if (!user || user.hashed_password !== password) {
      return res.status(400).json({
        success: false,
        data: { error: "Invalid username or password" },
      });
    }

    // Generate JWT token (expires in 5 hours)
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '5h' }
    );

    return res.status(201).json({ success: true, data: { token } });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({
      success: false,
      data: { error: "Server error during login" },
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Authentication Server running on port ${PORT}`);
});
