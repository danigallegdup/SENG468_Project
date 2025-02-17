// index.js (Main Entry Point)
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
const walletRoutes = require('./routes/walletRoutes');
const stockRoutes = require('./routes/stockRoutes');
const authRoutes = require('./routes/authRoutes');
const User = require('./models/User');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Endpoint
app.get("/", (req, res) => {
    res.send("✅ Backend is running!");
});
app.use(cors());
app.use(express.json());

connectDB();

// Start Server
app.use('/wallet', authMiddleware, walletRoutes);
app.use('/stocks', authMiddleware, stockRoutes);
app.use('/authentication', authRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
