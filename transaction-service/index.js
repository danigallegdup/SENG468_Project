/**
 * Transaction-Service/index.js
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
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo_db:27017/transactionDB";

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Transaction-Service/index.js: ✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("Transaction-Service/index.js: ❌ MongoDB Connection Error:", err));

app.use(express.json()); // Middleware to parse JSON requests

// Import Controllers & Models (No Routes, Calls Controllers Directly)
const { getWalletTransactions } = require("./controllers/walletController");
const { getStockTransactions } = require("./controllers/stockController");

require("./models/WalletTransaction"); // Ensure models are loaded
require("./models/StockTransaction");

// Fetch Wallet Transactions (Calls Controller Directly)
app.get("/api/walletTransactions", async (req, res) => {
  await getWalletTransactions(req, res);
});

// Fetch Stock Transactions (Calls Controller Directly)
app.get("/api/stockTransactions", async (req, res) => {
  await getStockTransactions(req, res);
});

// Health Check
app.get("/", (req, res) => {
  res.send("Transaction-Service/index.js: 🚀 Transaction Service is running...");
});

// Start Server
app.listen(PORT, () => console.log(`Transaction-Service/index.js: ✅ Server running on port ${PORT}`));



