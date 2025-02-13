// Import required dependencies
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
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

// MongoDB Connection
const connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1); // Exit process with failure
    }
};

// Start the server
const startServer = () => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

// Initialize the app
const init = async () => {
    console.log('Starting backend service...');
    console.log('MongoDB URI:', process.env.MONGO_URI); // Debugging MongoDB URI
    await connectToDatabase(); // Connect to MongoDB
    startServer(); // Start the server
};

// Import the User model
const User = require('./models/User');

// Route to create a new user
app.post('/api/users', async (req, res) => {
    try {
        const { username, email, hashed_password } = req.body;

        // Validate request data
        if (!username || !email || !hashed_password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check for duplicate username
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Create and save the user
        const newUser = new User({ username, email, hashed_password });
        await newUser.save();

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Import wallet routes
const walletRoutes = require('./routes/wallet');
app.use('/api/wallet', walletRoutes);

// Run the initialization function
init();
