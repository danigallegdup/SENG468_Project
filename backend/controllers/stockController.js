// const StockTransactions = require('../models/StockTransaction');
const Order = require('../models/Order');

exports.getStockTransactions = async (req, res) => {
    try {
        console.log(`🔍 START: Fetching stock transactions for user: ${req.user.id}`);

        // **Step 1: Fetch Transactions**
        let transactions;
        try {
            transactions = await Order.find({ user_id: req.user.id }).sort({ timeStamp: 1 });
            console.log(`✅ SUCCESS: Retrieved ${transactions.length} transactions for user ${req.user.id}`);
        } catch (dbErr) {
            console.error(`❌ DB ERROR: Failed to fetch transactions for user ${req.user.id}:`, dbErr.message);
            return res.status(500).json({ success: false, message: "Database Error: Could not fetch transactions" });
        }

        // **Step 2: Handle No Transactions Found**
        if (!transactions.length) {
            console.log("⚠️ WARNING: No stock transactions found for this user.");
            return res.status(200).json({ success: true, message: "No transactions available.", data: [] });
        }

        // **Step 3: Return Transactions**
        console.log("✅ SUCCESS: Stock transactions retrieved successfully.");
        res.json({ success: true, data: transactions });

    } catch (err) {
        console.error(`❌ UNEXPECTED ERROR: Failed to fetch stock transactions for user ${req.user.id}:`, err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
