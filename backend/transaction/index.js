const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken"); // ✅ Import `jsonwebtoken` here instead of `authMiddleware.js`
const cors = require("cors");
const connectDB = require("./db");


dotenv.config();

const PORT = process.env.PORT || 3004;

const authMiddleware = require("./authMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// Import Controllers & Models
const walletController= require("./controllers/walletController");
const stockController = require("./controllers/stockController");

require("./models/WalletTransaction"); // Ensure models are loaded
require("./models/Order");

// ✅ Secure Wallet Transactions Route
app.get("/getWalletTransactions", authMiddleware, walletController.getWalletTransactions);

// ✅ Secure Stock Transactions Route
app.get("/getStockTransactions", authMiddleware, stockController.getStockTransactions);

app.post(
  "/addMoneyToWallet",
  authMiddleware,
  walletController.addMoneyToWallet
);

app.post("/updateWallet", authMiddleware, walletController.updateWallet);
app.post("/updateStockPortfolio", authMiddleware, stockController.updateStockPortfolio);

/**
 * ----------------------------------------------------------------
 * GET /getWalletBalance
 * Get the balance of a wallet
 * ----------------------------------------------------------------
 */
app.get('/getWalletBalance', authMiddleware, walletController.getWalletBalance);
/**
 * ----------------------------------------------------------------
 * GET /getStockPortfolio
 * Retrieve user's stock portfolio
 * ----------------------------------------------------------------
 */
app.get('/getStockPortfolio', authMiddleware, stockController.getStockPortfolio);

app.get("/getStockPrices", authMiddleware, stockController.getStockPrices);

// Health Check
app.get("/", (req, res) => {
  res.send("🚀 Transaction-Service/index.js: Transaction Service is running...");
});

// Start Server
app.listen(PORT, () => console.log(`Transaction-Service/index.js: ✅ Server running on port ${PORT}`));
