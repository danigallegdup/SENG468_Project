// backend/userManagment/UserHeldStock.js
// Schema for stocks held by users

const mongoose = require('mongoose');

const UserHeldStockSchema = new mongoose.Schema({
    stock_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    stock_name: { type: mongoose.Schema.Types.String, required: true },
    quantity_owned: { type: Number, required: true },
    updated_at: { type: mongoose.Schema.Types.Date, required: false }

});

module.exports = mongoose.model('UserHeldStock', UserHeldStockSchema);