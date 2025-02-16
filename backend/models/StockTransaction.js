const mongoose = require("mongoose");

const StockTransactionSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Change ObjectId to String
    userId: { type: String, required: true }, // Change ObjectId to String
    stockId: String,
    isBuy: Boolean,
    orderType: String,
    stockPrice: Number,
    quantity: Number,
    orderStatus: String,
    timeStamp: String,
});

module.exports = mongoose.model("StockTransaction", StockTransactionSchema);
