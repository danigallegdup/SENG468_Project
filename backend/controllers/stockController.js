// controllers/stockController.js

const { getStockTransactions } = require('../utils/tempDatabase');

console.log("getStockTransactions:", getStockTransactions);


exports.getStockTransactions = async (req, res) => {
    try {
        const transactions = getStockTransactions(req.user.id);
        console.log("Returning stock transactions:", transactions);
        res.json({ success: true, data: transactions });
    } catch (err) {
        console.error("Error fetching stock transactions:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
