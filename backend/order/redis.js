/*
redis.js: Responsible for connecting to Redis cache client.
          Used by the Order Service and Matching Engine.
*/

const Redis = require("ioredis");

const redisClient = new Redis({
  host: "redis",
  port: 5001,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);  // Exponential backoff max 2s
  }
});

// Error handling
redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Order Service is Connected to Redis (ioredis)");
});

module.exports = redisClient;
