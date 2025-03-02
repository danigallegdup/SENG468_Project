/**
 * backened/transaction/index.js
 * 
 * - Entry Point: Initializes the Transaction Service.
 * - Purpose: Manages financial transactions related to wallets and stocks.
 * - Server Setup:
 *   - Uses Express.js to handle HTTP requests.
 *   - Connects to MongoDB using Mongoose.
 * - API Endpoints: 
 *   - Fetches wallet transactions (`/api/walletTransactions`).
 *   - Fetches stock transactions (`/api/stockTransactions`).
 * - Modular Design:
 *   - **Controllers:** (`walletController.js`, `stockController.js`) handle business logic.
 *   - **Models:** (`WalletTransaction.js`, `StockTransaction.js`) define database schemas.
 *   - **index.js:** Only routes requests and delegates processing.
 * - Additional Features:
 *   - JSON parsing middleware.
 *   - Health check endpoint (`/`).
 *   - Structured error handling for MongoDB connectivity.
 * - **Scalability:** Designed for easy expansion with new transaction types or financial services.
 */

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/transactionDB"; // Fallback to localhost

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Transaction-Service/index.js: ✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Exit on failure to prevent silent errors
  });

app.use(express.json()); // Middleware to parse JSON requests

// Import Controllers & Models
const { getWalletTransactions } = require("./controllers/walletController");
const { getStockTransactions } = require("./controllers/stockController");

require("./models/WalletTransaction"); // Ensure models are loaded
require("./models/StockTransaction");

// Fetch Wallet Transactions
app.get("/walletTransactions", async (req, res) => {
  try {
    await getWalletTransactions(req, res);
  } catch (error) {
    console.error("Transaction-Service/index.js: Error fetching wallet transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fetch Stock Transactions
app.get("/stockTransactions", async (req, res) => {
  try {
    await getStockTransactions(req, res);
  } catch (error) {
    console.error("Transaction-Service/index.js: Error fetching stock transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health Check
app.get("/", (req, res) => {
  res.send("🚀Transaction-Service/index.js:  Transaction Service is running...");
});

// Start Server
app.listen(PORT, () => console.log(`Transaction-Service/index.js: ✅ Server running on port ${PORT}`));
