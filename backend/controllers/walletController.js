// controllers/walletController.js
const WalletTransaction = require('../models/WalletTransaction');

// Get all wallet transactions for a user
exports.getWalletTransactions = async (req, res) => {
    try {
        const transactions = await WalletTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};



