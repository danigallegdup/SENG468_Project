const express = require('express');
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const { authenticateToken } = require("../app/user/auth.js");
require("dotenv").config();

const userService = express();
const port = 5001;

userService.use(cors());
userService.use(express.json());

// Connect to DB
const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

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


const db = client.db("userManagement"); //Database name (Should this be the same across services?)
const stocksCollection = db.collection("stocks"); // Collection for all stocks
const userStocksCollection = db.collection("userStocks"); // Collection to track stocks in user portfolios

// createStock endpoint
userService.post("/createStock", async (req, res) => {
    const token = req.headers["token"];
    if (!token) return res.status(401).json({ success: false, data: { error: "Missing token" } });

    const { stockName } = req.body;
    if (!stockName) return res.status(400).json({ success: false, data: { error: "Stock name required" } });

    try {
        //Check to make sure no duplicate stocks can be created
        const stockExists = await stocksCollection.findOne({ stockName: stockName });
        if (stockExists) return res.status(409).json({ success: false, data: { error: "Duplicate stock found" } });

        const result = await stocksCollection.insertOne({ stockName });
        res.json({ success: true, data: { stock_id: result.insertedId } });
    } catch (err) {
        res.status(500).json({ success: false, data: { error: err.message } });
    }
});

// getStockPortfolio endpoint
userService.get("/getStockPortfolio", async (req, res) => {
    const token = req.headers["token"];
    if (!token) return res.status(401).json( {success: false, data: { error: "Missing token" } });

    try {
        const user = await authenticateToken(token);
        if (!user) return res.status(401).json({ success: false, data: { error: "Invalid token" } });

        // Fetch only the stocks that belong to the authenticated user
        const stocks = await userStocksCollection.find({ user_id: user._id }).toArray();
        
        res.json({success: true, data: {stocks} }); //TODO: Check the stocks matches the required format
    } catch (err) {
        res.status(500).json({ success: false, data: { error: err.message } });
    }
});

// addStockToUser endpoint
userService.post("/addStockToUser", async (req, res) => {
    //Checks for relevant information
    const token = req.headers["token"];
    if (!token) return res.status(401).json({ error: "Missing token" });

    const { stockId, quantity } = req.body;
    if (!stockId || !quantity) return res.status(400).json({ error: "Stock ID & quantity required" });

    try {
        // Authenticate user token and get user id
        // I believe this check must be done every time this endpoint is hit,
        // since all that's provided to the endpoint in the test run is the token.
        const user = await authenticateToken(token);
        if (!user) return res.status(401).json({ error: "Invalid token" });

        // Check to ensure stock exists
        const stockExists = await stocksCollection.findOne({ _id: new ObjectId(stockId) });
        if (!stockExists) return res.status(404).json({ success: false, data: { error: "Stock not found" } });

        // Check if stock already exists in the user's portfolio
        const stockAlreadyInPortfolio = await userStocksCollection.findOne({ user_id: user._id, stockId });

        if (stockAlreadyInPortfolio) {
            // Update the existing stock entry by adding the quantity
            await userStocksCollection.updateOne(
                { user_id: user._id, stockId },
                { $inc: { quantity } } // This increments the existing entry automatically
            );
        } else {
            // Insert new stock entry
            await userStocksCollection.insertOne({ user_id: user._id, stockId, quantity });
        }
        res.json({ success: true, data: null });
    } catch (err) {
        res.status(500).json({ success: false, data: { error: err.message } });
    }
});

// Start Server
userService.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});