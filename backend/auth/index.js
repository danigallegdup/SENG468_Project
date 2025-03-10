/**
 * // backend/routes/authRoutes.js
 * // Routes for user authentication
 * 
 * @route   POST /api/auth/register
 * @route   POST /api/auth/login
 */

// routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const cors = require("cors");
const app = express();
const { v4: uuidv4 } = require("uuid");

const redisClient = require("./redis"); // Import Redis


// Middleware
app.use(cors());
app.use(express.json());
dotenv.config();

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
      console.log('All fields are required');
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Check if user exists in Redis
    const existingUser = await redisClient.exists(`user:${user_name}`);
    if (existingUser) {
      console.log(`User ${user_name} already exists`);
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    const userId = uuidv4();

    // Store user data in Redis as a hash
    await redisClient.hmset(`user:${user_name}`, {
      id: userId,
      username: user_name,
      name: name,
      password: password, // Storing plain text password (as per request)
    });
    console.log(`User ${user_name} registered successfully`);
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ success: false, error: 'Server error during registration' });
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
      console.log('Both user_name and password are required');
      return res.status(400).json({ success: false, error: 'Both user_name and password are required' });
    }

    const userData = await redisClient.hgetall(`user:${user_name}`);
    if (!userData || userData.password !== password) {
      console.log('Invalid username or password');
      return res.status(400).json({ success: false, error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: userData.id, username: user_name }, process.env.JWT_SECRET, {
      expiresIn: '5h',
    });
    console.log(`User ${user_name} logged in successfully`);
    return res.status(200).json({ success: true, data: { token } });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Authentication Server running on port ${PORT}`);
});
