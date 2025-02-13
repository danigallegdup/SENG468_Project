// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// User Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Validate password (in production, use bcrypt for hashing)
        if (user.hashed_password !== password) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '5h'
        });

        res.json({ success: true, data: { token } });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
