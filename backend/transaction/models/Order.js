// backend/models/Order.js
// Define the schema for the Order model

const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const orderSchema = {
  user_id: ObjectId, // ID of the user placing the order
  stock_id: String, // Stock symbol
  is_buy: Boolean, // Specifies if order is buy (True) or sell (False)
  order_type: String, // "MARKET" or "LIMIT"
  quantity: Number, // Quantity  of stocks in the order
  stock_price: Number, // Price per stock (for limit orders)
  order_status: String, // Order status: "IN_PROGRESS", "PARTIALLY_COMPLETE", "COMPLETED"
  created_at: Date, // Timestamp of order creation
  stock_tx_id: String,
  parent_stock_tx_id: String,
  wallet_tx_id: String,
};

module.exports = mongoose.model("Order", orderSchema); // Export schema for use in MongoDB operations
