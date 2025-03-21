// backend/matchingEngine/db.js
// MongoDB Connection Configuration

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const URL="mongodb://mongo1:27017/danigallegdup?replicaSet=rs0";

const connectDB = async () => {
  try {
    console.log("🔍 Connecting to MongoDB Atlas... process.env.MONGO_URI" );
    await mongoose.connect(URL, {
      readPreference: 'nearest',
      useNewUrlParser: true,
      useUnifiedTopology: true,
      readPreference: "nearest",
      replicaSet: "rs0",
      maxPoolSize: 200,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: "majority"
    });
    console.log("✅ MongoDB Atlas Connected Successfully");

    return mongoose.connection.db;
  } catch (err) {
    console.error("❌ MongoDB Connection for Matching Engine Failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
