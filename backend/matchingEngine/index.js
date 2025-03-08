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

// 📌 **Start Matching Engine**
const PORT = process.env.MATCHING_ENGINE_PORT || 3006;
app.listen(PORT, () => {
  console.log(`🚀 Matching Engine running on port ${PORT}`);
});
