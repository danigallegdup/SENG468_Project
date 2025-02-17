// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @body    { user_name, password, name }
 * @return  { success: true, data: null } on success,
 *          { success: false, data: { error: <errorMessage> } } on failure.
 */
router.post('/register', async (req, res) => {
  try {
    const { user_name, password, name } = req.body;

    // Validate required fields
    if (!user_name || !password || !name) {
      return res.status(400).json({
        success: false,
        data: { error: 'All fields (user_name, password, name) are required' }
      });
    }

    // Check if user already exists
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
      // Optionally, if you update your schema you can store the 'name'
    });

    await newUser.save();

    return res.status(201).json({ success: true, data: null });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({
      success: false,
      data: { error: 'Server error during registration' }
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
router.post('/login', async (req, res) => {
  try {
    const { user_name, password } = req.body;

    if (!user_name || !password) {
      return res.status(400).json({
        success: false,
        data: { error: 'Both user_name and password are required' }
      });
    }

    // Find user by username (using the 'user_name' field from the request)
    const user = await User.findOne({ username: user_name });
    if (!user || user.hashed_password !== password) {
      return res.status(400).json({
        success: false,
        data: { error: 'Invalid username or password' }
      });
    }

    // Generate JWT token (expires in 5 hours)
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '5h' }
    );

    return res.json({ success: true, data: { token } });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({
      success: false,
      data: { error: 'Server error during login' }
    });
  }
});

module.exports = router;