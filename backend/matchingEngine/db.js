// backend/matchingEngine/db.js
// MongoDB Connection Configuration

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const URI = "mongodb+srv://gabe:LgfYYjPtues0CiVF@assets.uth6v.mongodb.net/?retryWrites=true&w=majority&appName=assets";

const connectDB = async () => {
  try {
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      readPreference: 'secondaryPreferred'
    });
    console.log("✅ MongoDB Atlas Connected Successfully for Matching Engine");

    return mongoose.connection.db;
  } catch (err) {
    console.error("❌ MongoDB Connection for Matching Engine Failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
