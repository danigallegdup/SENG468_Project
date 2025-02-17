const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
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
