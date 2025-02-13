// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const StockTransaction = require('../models/StockTransaction');
const authMiddleware = require('../middleware/authMiddleware');

// Get all stock transactions for a user
router.get('/getStockTransactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await StockTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
