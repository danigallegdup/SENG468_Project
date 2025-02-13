// routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const { getWalletTransactions } = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');

// Wallet Transactions Route
router.get('/getWalletTransactions', authMiddleware, getWalletTransactions);

module.exports = router;

router.get('/getWalletTransactions', authMiddleware, async (req, res) => {
    console.log("Request received for wallet transactions");
    console.log("User Info:", req.user); // Log the decoded JWT user

    try {
        const transactions = await WalletTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });
        console.log("Transactions Found:", transactions); // Log fetched transactions
        res.json({ success: true, data: transactions });
    } catch (err) {
        console.error("Error fetching transactions:", err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});
