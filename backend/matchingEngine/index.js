require('dotenv').config();
const express = require('express');
const redisClient = require('./redis');
const { startConsumersForStock } = require('./matchingConsumer');
const { connectRabbitMQ } = require('./rabbitmq');

const app = express();
app.use(express.json());

connectRabbitMQ().catch(console.error);

// Stock polling loop
setInterval(async () => {
  try {
    const stockIds = await redisClient.smembers("active_stock_ids");
    for (const stockId of stockIds) {
      await startConsumersForStock(stockId);
    }
  } catch (err) {
    console.error("❌ Error in stock polling loop:", err);
  }
}, 3000); // every 3s

// Optional health endpoint
app.get("/health", (_, res) => res.send("🟢 Matching Engine OK"));

const PORT = process.env.MATCHING_ENGINE_PORT || 3006;
app.listen(PORT, () => {
  console.log(`🚀 Matching Engine running on port ${PORT}`);
});
