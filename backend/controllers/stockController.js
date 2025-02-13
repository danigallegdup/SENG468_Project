// controllers/stockController.js
const StockTransaction = require('../models/StockTransaction');

// Get all stock transactions for a user
exports.getStockTransactions = async (req, res) => {
    try {
        const transactions = await StockTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};