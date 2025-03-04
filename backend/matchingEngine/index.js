require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const { consumeOrders } = require('./matchingConsumer');
const connectDB = require('./db');
const { matchOrder } = require('./matchOrder');
const {connectRabbitMQ} = require("./rabbitmq"); // Import/start RabbitMQ

const app = express();
app.use(express.json());

// RabbitMQ connection
connectRabbitMQ().catch(console.error);

// MongoDB connection
connectDB();

// Redis client setup
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = redis.createClient({ url: REDIS_URL });

redisClient.connect()
  .then(() => console.log('✅ Connected to Redis'))
  .catch(err => console.error('❌ Redis Connection Error:', err));

// Start RabbitMQ consumer to process orders asynchronously
consumeOrders().catch(console.error);

// **GET /getStockPrices** - Retrieve latest stock prices from Redis
app.get('/getStockPrices', async (req, res) => {
  try {
    const keys = await redisClient.keys('lowest_price:*');
    const prices = {};

    for (const key of keys) {
      const stock_id = key.split(':')[1];
      prices[stock_id] = await redisClient.get(key);
    }

    res.json({ success: true, data: prices });
  } catch (error) {
    console.error('❌ Error fetching stock prices:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 📌 **Start Matching Engine**
const PORT = process.env.MATCHING_ENGINE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 Matching Engine running on port ${PORT}`);
});
