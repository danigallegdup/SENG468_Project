const express = require('express');
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const userAuthService = express();
const port = 5000;

userAuthService.use(cors());
userAuthService.use(express.json());

// Connect to DB
const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

const JWT_SECRET = "supersecretkey";

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to DB");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}
connectDB();


const db = client.db("userAuthentication"); // This is the DB name
const usersCollection = db.collection("users"); // This is the Collection (Document) name inside the DB

// register endpoint
userAuthService.post("/register", async (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: "Username, Password, and Name required" });
    const is_authenticated = false;

    try {
        // Check for an existing user - usernames must be unique
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(401).json({ error: "Invalid username" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await usersCollection.insertOne({ username, password: hashedPassword, name, is_authenticated });
        res.json(result); // TODO: switch to json object as specified in SingleUserTest
    } catch (err) {
        res.status(500).json({ error: err.message }); // TODO: switch to json object as specified in SingleUserTest
    }
});

// login endpoint
userAuthService.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and Password required" }); // TODO: switch to json object as specified in SingleUserTest

    try {
        // Find user by username
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: "10h" });

        // Update user document with new token and authentication status
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { is_authenticated: true, token } }
        );

        res.json({ token, message: "Login successful" }); // TODO: switch to json object

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// authenticate token function
// Authenticates a token and returns the user_id associated with this token.
// Will be used by other services to get user id when passed a token.
async function authenticateToken(userToken) {
    if (!userToken) {
        return res.status(401).json({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(userToken, JWT_SECRET);
        const userId = decoded.userId;

        // Fetching the associated user from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        
        if (!user) {
            throw new Error("User not found");
        }

        return user; // Return the user object
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new Error("Token has expired");
        }
        throw new Error("Invalid token");
    }
}

// This allows the function to be used by other services
module.exports = { authenticateToken }


// Start Server
userAuthService.listen(port, () => {
    console.log(`Database server running on http://localhost:${port}`);
});