const StockTransaction = require('../models/StockTransaction');

exports.getStockTransactions = async (req, res) => {
    try {
        console.log(`Fetching stock transactions for user: ${req.user.id}`);

        const transactions = await StockTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });

        if (!transactions.length) {
            console.log("No stock transactions found.");
            return res.status(200).json({ success: true, message: "No transactions available.", data: [] });
        }

        console.log("Stock transactions retrieved successfully.");
        res.json({ success: true, data: transactions });

    } catch (err) {
        console.error("Error fetching stock transactions:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
