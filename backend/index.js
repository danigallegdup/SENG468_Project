// index.js (Main Entry Point)
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
const walletRoutes = require('./routes/walletRoutes');
const stockRoutes = require('./routes/stockRoutes');
const User = require('./models/User');

dotenv.config();

// Initialize Express app
const app = express();


// Middleware
app.use(cors());
app.use(express.json());

// Test Endpoint
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/stocks', authMiddleware, stockRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/', authRoutes);

app.use('/', walletRoutes);

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
