require("dotenv").config();
const express = require("express");
const cors = require("cors");
const redisClient = require("./redis");
const authMiddleware = require("./authMiddleware");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// Health-check route
app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/", (req, res) => {
  res.send("✅ User Management Service is running!");
});

/**
 * ----------------------------------------------------------------
 * POST /createStock
 * Create a new stock in Redis
 * ----------------------------------------------------------------
 */
app.post("/createStock", authMiddleware, async (req, res) => {
  try {
    const { stock_name } = req.body;
    if (!stock_name) {
      return res.status(400).json({ success: false, message: "Stock name is required" });
    }

    // Check if stock exists in Redis
    const existingStockId = await redisClient.get(`stock_name_to_id:${stock_name}`);
    if (existingStockId) {
      return res.status(409).json({ success: false, message: "Stock already exists" });
    }

    // Create a new stock ID
    const stock_id = uuidv4();

    // Store stock details in Redis
    await redisClient.hset(`stock:${stock_id}`, {
      stock_id,
      stock_name,
      current_price: 0,
    });

    // Map stock name to stock_id
    await redisClient.set(`stock_name_to_id:${stock_name}`, stock_id);

    res.json({ success: true, data: { stock_id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ----------------------------------------------------------------
 * POST /addStockToUser
 * Add a quantity of a stock to the user in Redis
 * ----------------------------------------------------------------
 */
app.post("/addStockToUser", authMiddleware, async (req, res) => {
  try {
    const { stock_id, quantity } = req.body;

    if (!stock_id || !quantity) {
      return res.status(400).json({ success: false, data: { error: "Stock ID & quantity required" } });
    }

    // Check if stock exists in Redis
    const stockDetails = await redisClient.hgetall(`stock:${stock_id}`);
    if (!stockDetails || Object.keys(stockDetails).length === 0) {
      return res.status(404).json({ success: false, data: { error: "Stock not found" } });
    }

    // Fetch user's current stock quantity
    let userStockQuantity = await redisClient.zscore(`stock_portfolio:${req.user.id}`, stock_id);
    userStockQuantity = userStockQuantity ? parseInt(userStockQuantity) : 0;

    // Update user's stock quantity
    const newQuantity = userStockQuantity + parseInt(quantity);
    await redisClient.zadd(`stock_portfolio:${req.user.id}`, newQuantity, stock_id);

    console.log(`✅ Added stock ${stock_id} to user ${req.user.id}, new quantity: ${newQuantity}`);
    return res.json({ success: true, data: null });
  } catch (err) {
    console.error("❌ Error adding stock to user:", err);
    return res.status(500).json({ success: false, data: { error: err.message } });
  }
});


// Start server
const PORT = process.env.USERMANAGEMENT_SERVICE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 User Management Service running on port ${PORT}`);
});
