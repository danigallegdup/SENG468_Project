/*
redis.js: Responsible for connecting to Redis cache client.
          Used by the Order Service and Matching Engine.
*/

const redis = require("redis");

const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Redis connection
const redisClient = redis.createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
});

redisClient.on("error", (err) => console.error("❌ Redis Error:", err));

redisClient.on("connect", () => console.log("✅ Redis connected"));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("❌ Redis Connection Failed:", err);
  }
})();

module.exports = redisClient;
