const redis = require("redis");
const client = redis.createClient();        // Create Redis client instance

client.on("error", console.error("Redis Error:", err));

module.exports = client;        // Export Redis client for use in other files