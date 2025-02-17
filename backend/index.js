// index.js (Main Entry Point)
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const stockRoutes = require("./routes/stockRoutes");
const User = require("./models/User");

dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Endpoint
app.get("/", (req, res) => {
    res.send("✅ Backend is running!");
});

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);  // ✅ Authentication routes (Login, Register, etc.)
app.use("/api/wallet", walletRoutes);  // ✅ Wallet-related routes
app.use("/api/stocks", stockRoutes);  // ✅ Stock-related routes

// User Registration Route
app.post("/api/users", async (req, res) => {
    try {
        const { username, email, hashed_password } = req.body;

        if (!username || !email || !hashed_password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const newUser = new User({ username, email, hashed_password });
        await newUser.save();

        res.status(201).json({ message: "✅ User created successfully", user: newUser });
    } catch (err) {
        console.error("❌ Error creating user:", err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
