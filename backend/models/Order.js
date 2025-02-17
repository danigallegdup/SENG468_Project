const { ObjectId } = require("mongodb");

const orderSchema = {
    _id: ObjectId,          // Unique ID for each order
    user_id: ObjectId,      // ID of the user placing the order
    stock_id: String,       // Stock symbol
    is_buy: Boolean,        // Specifies if order is buy (True) or sell (False)
    order_type: String,     // "MARKET" or "LIMIT"
    quantity: Number,       // Quantity  of stocks in the order
    price: Number,          // Price per stock (for limit orders)
    status: String,         // Order status: "IN_PROGRESS", "PARTIALLY_COMPLETE", "COMPLETED"
    created_at: Date        // Timestamp of order creation
};

module.exports = orderSchema;       // Export schema for use in MongoDB operations

