const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken"); // ✅ Import `jsonwebtoken` here instead of `authMiddleware.js`

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/transactionDB";

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Transaction-Service/index.js: ✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Exit on failure to prevent silent errors
  });

app.use(express.json()); // Middleware to parse JSON requests

// ✅ Inline Authentication Middleware (Replaces `authMiddleware.js`)
const authMiddleware = (req, res, next) => {
  let token = req.header("Authorization");

  // ✅ Ensure the token is in the correct format (`Authorization: Bearer <token>`)
  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1]; // Extract token
  }

  console.log("Token Received:", token); // Debugging output

  if (!token) {
    return res.status(401).json({ success: false, message: "Access Denied: No Token Provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded); // ✅ Debugging token payload
    req.user = decoded; // Attach user info to request
    next();
  } catch (err) {
    console.error("JWT Verification Failed:", err);
    res.status(401).json({ success: false, message: "Invalid Token" });
  }
};

// Import Controllers & Models
const { getWalletTransactions } = require("./controllers/walletController");
const { getStockTransactions } = require("./controllers/stockController");

require("./models/WalletTransaction"); // Ensure models are loaded
require("./models/StockTransaction");

// ✅ Secure Wallet Transactions Route
app.get("/walletTransactions", authMiddleware, async (req, res) => {
  try {
    await getWalletTransactions(req, res);
  } catch (error) {
    console.error("Transaction-Service/index.js: Error fetching wallet transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Secure Stock Transactions Route
app.get("/stockTransactions", authMiddleware, async (req, res) => {
  try {
    await getStockTransactions(req, res);
  } catch (error) {
    console.error("Transaction-Service/index.js: Error fetching stock transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health Check
app.get("/", (req, res) => {
  res.send("🚀 Transaction-Service/index.js: Transaction Service is running...");
});

// Start Server
app.listen(PORT, () => console.log(`Transaction-Service/index.js: ✅ Server running on port ${PORT}`));
