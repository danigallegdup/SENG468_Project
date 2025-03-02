// userManagement/index.js
// Routes for managing stocks, user stocks, and wallets

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Stock = require('./Stock');
const UserHeldStock = require('./UserHeldStock');
const authMiddleware = require('../middleware/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Health-check route
app.get('/', (req, res) => {
  res.send('✅ Stock Management Service is running!');
});

/**
 * ----------------------------------------------------------------
 * POST /createStock
 * Create a new stock
 * ----------------------------------------------------------------
 */
app.post('/createStock', authMiddleware, async (req, res) => {
  try {
    const { stock_name } = req.body;
    if (!stock_name) {
      return res.status(400).json({ success: false, message: 'Stock name is required' });
    }

    const stockExists = await Stock.findOne({ stock_name });
    if (stockExists) {
      return res.status(409).json({ success: false, message: 'Stock already exists' });
    }

    const newStock = new Stock({ stock_name, current_price: 0 });
    await newStock.save();

    res.json({ success: true, data: { stock_id: newStock._id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ----------------------------------------------------------------
 * GET /getStockPortfolio
 * Retrieve user's stock portfolio
 * ----------------------------------------------------------------
 */
app.get('/getStockPortfolio', authMiddleware, async (req, res) => {
  try {
    const stocks = await UserHeldStock.find({ user_id: req.user.id });
    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ----------------------------------------------------------------
 * POST /addStockToUser
 * Add a quantity of a stock to the user
 * ----------------------------------------------------------------
 */
app.post('/addStockToUser', authMiddleware, async (req, res) => {
  const { stock_id, quantity } = req.body;

  if (!stock_id || !quantity) {
    return res.status(400).json({ success: false, data: { error: "Stock ID & quantity required" } });
  }

  try {
    const stockExists = await Stock.findById(stock_id);
    if (!stockExists) {
      return res.status(404).json({ success: false, data: { error: "Stock not found" } });
    }

    let userStock = await UserHeldStock.findOne({ user_id: req.user.id, stock_id });
    if (userStock) {
      userStock.quantity_owned = userStock.quantity_owned + quantity;
      await userStock.save();
    } else {
      userStock = new UserHeldStock({
        user_id: req.user.id,
        stock_id,
        stock_name: stockExists.stock_name,
        quantity_owned: quantity,
        updated_at: new Date()
      });
      await userStock.save();
    }

    return res.json({ success: true, data: null });
  } catch (err) {
    return res.status(500).json({ success: false, data: { error: err.message } });
  }
});

/**
 * ----------------------------------------------------------------
 * GET /getWalletBalance
 * Get the balance of a wallet
 * ----------------------------------------------------------------
 */
app.get('/getWalletBalance', authMiddleware, async (req, res) => {
    try {
        // Fetch the latest transaction by sorting with the actual timestamp in descending order.
        const lastTransaction = await Wallet.findOne({ userId: req.user.id })
            .sort({ timeStamp: 'desc' })
            .exec();
        const balance = lastTransaction ? lastTransaction.balance : 0;
        return res.json({ success: true, data: { balance } });
    } catch (err) {
        console.error("Error fetching wallet balance:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

/**
 * ----------------------------------------------------------------
 * POST /addMoneyToWallet
 * Add a balance to a wallet
 * ----------------------------------------------------------------
 */
app.post('/addMoneyToWallet', authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                data: { error: "amount must be a positive number" }
            });
        }
        // Retrieve the current balance from the most recent transaction.
        const lastTransaction = await WalletTransaction.findOne({ userId: req.user.id })
            .sort({ timeStamp: 'desc' })
            .exec();
        const currentBalance = lastTransaction ? lastTransaction.balance : 0;
        const newBalance = currentBalance + amount;
  
        const newTransaction = new Wallet({
            userId: req.user.id,
            balance: newBalance,
            timeStamp: new Date() // Set the actual timestamp when the transaction is made.
        });
        await newTransaction.save();
        return res.json({ success: true, data: null });
    } catch (err) {
        console.error("Error adding money to wallet:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


// Start server
const PORT = process.env.USERMANAGEMENT_SERVICE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 Stock Management Service running on port ${PORT}`);
});
