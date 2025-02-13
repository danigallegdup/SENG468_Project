// controllers/walletController.js
const WalletTransaction = require('../models/WalletTransaction');

exports.getWalletTransactions = async (req, res) => {
    try {
        console.log(`Fetching wallet transactions for user: ${req.user.id}`);
        
        const transactions = await WalletTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });

        if (!transactions.length) {
            console.log("No wallet transactions found.");
            return res.status(200).json({ success: true, message: "No transactions available.", data: [] });
        }

        console.log("Wallet transactions retrieved successfully.");
        res.json({ success: true, data: transactions });

    } catch (err) {
        console.error("Error fetching wallet transactions:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
