// backend/models/Stock.js
// Define the schema for the Stock model

const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
    stock_name: { type: String, required: true, unique: true },
    current_price: { type: Number, required: true }
});

module.exports = mongoose.model("Stock", stockSchema);