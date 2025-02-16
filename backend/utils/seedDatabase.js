const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables
const WalletTransaction = require("../models/WalletTransaction");
const StockTransaction = require("../models/StockTransaction");

const walletTransactions = [
    {
        _id: "wtx001",
        userId: "user123",
        amount: 500,
        type: "deposit",
        timeStamp: new Date().toISOString()
    },
    {
        _id: "wtx002",
        userId: "user123",
        amount: 200,
        type: "withdrawal",
        timeStamp: new Date().toISOString()
    }
];

const stockTransactions = [
    {
        _id: "stx001",
        userId: "user123",
        stockId: "AAPL",
        isBuy: true,
        orderType: "MARKET",
        stockPrice: 150,
        quantity: 10,
        orderStatus: "COMPLETED",
        timeStamp: new Date().toISOString()
    },
    {
        _id: "stx002",
        userId: "user123",
        stockId: "TSLA",
        isBuy: false,
        orderType: "LIMIT",
        stockPrice: 900,
        quantity: 5,
        orderStatus: "PENDING",
        timeStamp: new Date().toISOString()
    }
];

// Function to insert data into MongoDB
const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("✅ Connected to MongoDB");

        // Insert wallet transactions
        await WalletTransaction.deleteMany({});
        await WalletTransaction.insertMany(walletTransactions);
        console.log("✅ Wallet Transactions Inserted");

        // Insert stock transactions
        await StockTransaction.deleteMany({});
        await StockTransaction.insertMany(stockTransactions);
        console.log("✅ Stock Transactions Inserted");

        mongoose.connection.close();
        console.log("✅ Database Seeding Complete");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        mongoose.connection.close();
    }
};

seedDatabase();
