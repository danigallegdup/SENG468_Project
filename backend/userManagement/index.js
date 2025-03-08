// userManagement/index.js
// Routes for managing stocks, user stocks, and wallets

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Stock = require('./Stock');
const UserHeldStock = require('./UserHeldStock');
const authMiddleware = require('./authMiddleware');
const SERVICE_AUTH_TOKEN = "supersecretauthtoken";  // process.env.SERVICE_AUTH_TOKEN isn't working
const { v4: uuidv4 } = require("uuid");

const redisClient = require("./redis");


const app = express();
app.use(cors());
app.use(express.json());

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Health-check route
app.get("/health", (req, res) => res.status(200).send("OK"));
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

    // Check redis cache to check if stock exists instead of hitting db
    const stockExists = await redisClient.get(`stock:${stock_name}`);
    if (stockExists) {
      return res.status(409).json({ success: false, message: 'Stock already exists' });
    }

    const newStock = new Stock({ stock_name, current_price: 0 });
    await newStock.save();

    // Store the stock name in redis as a simple key value pair. This ensures duplicate stock names can't exist
    await redisClient.set(`stock:${stock_name}`, newStock._id);

    res.json({ success: true, data: { stock_id: newStock._id } });
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