/*
redis.js: Responsible for connecting to Redis cache client.
          Used by the Order Service and Matching Engine.
*/


const redis = require("redis");

// Redis connection
const redisClient = redis.createClient({
  url: "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("❌ Redis Error:", err));

(async () => {
  await redisClient.connect();
  console.log("✅ Redis connected");
})();

module.exports = redisClient;
