// backend/matchingEngine/db.js
// MongoDB Connection Configuration

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Atlas Connected Successfully for Matching Engine");

    return mongoose.connection.db;
  } catch (err) {
    console.error("❌ MongoDB Connection for Matching Engine Failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
