// models/Stock.js
const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
    stock_name: { type: mongoose.Schema.Types.String, required: true }
});

module.exports = mongoose.model('Stock', StockSchema);