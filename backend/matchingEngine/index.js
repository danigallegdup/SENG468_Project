require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redisClient = require('./redis');
const { consumeOrders } = require('./matchingConsumer');
const { matchOrder } = require('./matchOrder');
const {connectRabbitMQ} = require("./rabbitmq"); // Import/start RabbitMQ

const app = express();
app.use(express.json());

// RabbitMQ connection
connectRabbitMQ().catch(console.error);

// Start RabbitMQ consumer to process orders asynchronously
consumeOrders().catch(console.error);

// 📌 **Start Matching Engine**
const PORT = process.env.MATCHING_ENGINE_PORT || 3006;
app.listen(PORT, () => {
  console.log(`🚀 Matching Engine running on port ${PORT}`);
});
