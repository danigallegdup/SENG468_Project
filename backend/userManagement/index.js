// userManagement/index.js
// Routes for managing stocks, user stocks, and wallets

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Stock = require('./Stock');
const UserHeldStock = require('./UserHeldStock');
const Wallet = require('./Wallet');
const WalletTransaction = require('./WalletTransaction');
const authMiddleware = require('../middleware/authMiddleware');
const SERVICE_AUTH_TOKEN = "supersecretauthtoken";  // process.env.SERVICE_AUTH_TOKEN isn't working


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
  res.send('✅ User Management Service is running!');
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
    newStock.stock_id = newStock._id;
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

// Internal Endpoints
// Use a Service Token defined in .env

/**
 * ----------------------------------------------------------------
 * POST /internal/addStockToUser
 * Internal: Add stock to a user's account (Uses service token for authentication)
 * ----------------------------------------------------------------
 */
app.post('/internal/addStockToUser', async (req, res) => {
  try {
      const { stock_id, quantity, user_id, service_token } = req.body;

      // Validate service token
      if (!service_token || service_token !== SERVICE_AUTH_TOKEN) {
          console.log("Invalid service token: ", service_token);
          console.log("Expected: ", SERVICE_AUTH_TOKEN);
          return res.status(403).json({ success: false, message: "Unauthorized service request" });
      }

      // Validate inputs
      if (!stock_id || !quantity || quantity <= 0 || !user_id) {
          return res.status(400).json({ success: false, data: { error: "Valid stock_id, user_id, and positive quantity required" } });
      }

      // Check if the stock exists
      const stockExists = await Stock.findById(stock_id);
      if (!stockExists) {
          return res.status(404).json({ success: false, data: { error: "Stock not found" } });
      }

      // Check if the user already holds this stock
      let userStock = await UserHeldStock.findOne({ user_id, stock_id });

      if (userStock) {
          userStock.quantity_owned += quantity;
          userStock.updated_at = new Date();
          await userStock.save();
      } else {
          userStock = new UserHeldStock({
              user_id,
              stock_id,
              stock_name: stockExists.stock_name,
              quantity_owned: quantity,
              updated_at: new Date()
          });
          await userStock.save();
      }

      return res.json({ success: true, data: null });
  } catch (err) {
      console.error("Error in internal addStockToUser:", err);
      return res.status(500).json({ success: false, message: "Server error" });
  }
});


/**
 * ----------------------------------------------------------------
 * POST /internal/addMoneyToWallet
 * Internal: Add balance to a wallet (Uses service token specified in .env)
 * ----------------------------------------------------------------
 */
app.post('/internal/addMoneyToWallet', async (req, res) => {
  try {
    console.log("🔍 Received Wallet addMoney API Request:", req.body);
      const { amount, user_id, service_token } = req.body;

      // Validate service token
      if (!service_token || service_token !== SERVICE_AUTH_TOKEN) {
          return res.status(403).json({ success: false, message: "Unauthorized service request" });
      }

      if (!amount || amount <= 0 || !user_id) {
          return res.status(400).json({
              success: false,
              data: { error: "Valid amount and user_id are required" }
          });
      }

      // Retrieve the current balance from the most recent transaction.
      const lastTransaction = await WalletTransaction.findOne({ userId: user_id })
          .sort({ timeStamp: 'desc' })
          .exec();
      const currentBalance = lastTransaction ? lastTransaction.balance : 0;
      const newBalance = currentBalance + amount;

      // Save new balance
      const newTransaction = new Wallet({
          userId: user_id,
          balance: newBalance,
          timeStamp: new Date()
      });
      await newTransaction.save();

      return res.json({ success: true, data: null });
  } catch (err) {
      console.error("Error in internal addMoneyToWallet:", err);
      return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
* ----------------------------------------------------------------
* POST /internal/subMoneyFromWallet
* Internal: Subtract balance from a wallet (Uses user token specified in .env)
* ----------------------------------------------------------------
*/
app.post('/internal/subMoneyFromWallet', async (req, res) => {
  try {
      console.log("🔍 Received Wallet subMoney API Request:", req.body);
      const { amount, user_id, service_token } = req.body;

      // Validate service token
      if (!service_token || service_token !== SERVICE_AUTH_TOKEN) {
        console.log("Invalid service token: ", service_token);
        console.log("Expected: ", SERVICE_AUTH_TOKEN);
          return res.status(403).json({ success: false, message: "Unauthorized service request" });
      }

      if (!amount || amount <= 0 || !user_id) {
          return res.status(400).json({
              success: false,
              data: { error: "Valid amount and user_id are required" }
          });
      }

      // Retrieve the current balance from the most recent transaction.
      const lastTransaction = await WalletTransaction.findOne({ userId: user_id })
          .sort({ timeStamp: 'desc' })
          .exec();
      const currentBalance = lastTransaction ? lastTransaction.balance : 0;
      const newBalance = currentBalance - amount;

      // Ensure user has sufficient balance
      if (newBalance < 0) {
          return res.status(400).json({
              success: false,
              data: { error: "User has insufficient funds" }
          });
      }

      // Save new balance
      const newTransaction = new Wallet({
          userId: user_id,
          balance: newBalance,
          timeStamp: new Date()
      });
      await newTransaction.save();

      return res.json({ success: true, data: null });
  } catch (err) {
      console.error("Error in internal subMoneyFromWallet:", err);
      return res.status(500).json({ success: false, message: "Server error" });
  }
});


// Start server
const PORT = process.env.USERMANAGEMENT_SERVICE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 User Management Service running on port ${PORT}`);
});
