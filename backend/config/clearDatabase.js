// backend/config/clearDatabase.js
// Script to reset the database


const redisClient = require("./redis");

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();


const clearCache = async () => {
  try {

    // Flush all data from Redis
    const result = await redisClient.flushall();
    console.log("✅ Redis database cleared successfully: ", result);

    await redisClient.quit();
  } catch (err) {
    console.error("❌ Failed to clear Redis database:", err.message);
  }
};

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      readPreference: 'secondaryPreferred'
    });
    console.log("✅ MongoDB Atlas Connected Successfully");

    await mongoose.connection.db.dropDatabase();
    console.log("✅ Database cleared successfully");

    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to clear database:", err.message);
    process.exit(1);
  }
};

clearDatabase();
clearCache();