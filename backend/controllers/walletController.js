// controllers/walletController.js
const WalletTransaction = require('../models/WalletTransaction');

// Existing function for getting wallet transactions
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

/**
 * @desc    Retrieve wallet balance for the logged-in user
 * @route   GET /getWalletBalance
 * @return  { success: true, data: { balance: <computed_balance> } }
 */
exports.getWalletBalance = async (req, res) => {
    try {
        // Retrieve all wallet transactions for the user
        const transactions = await WalletTransaction.find({ userId: req.user.id });
        let balance = 0;
        // Compute balance: deposit adds; withdrawal subtracts
        transactions.forEach(tx => {
            if (tx.type === 'deposit') {
                balance += tx.amount;
            } else if (tx.type === 'withdrawal') {
                balance -= tx.amount;
            }
        });
        return res.json({ success: true, data: { balance } });
    } catch (err) {
        console.error("Error fetching wallet balance:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * @desc    Add money to the wallet for the logged-in user
 * @route   POST /addMoneyToWallet
 * @body    { amount: Number }
 * @return  { success: true, data: null }
 */
exports.addMoneyToWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                data: { error: "Amount must be a positive number" }
            });
        }
        // Create a deposit transaction
        const newTransaction = new WalletTransaction({
            userId: req.user.id,
            amount,
            type: 'deposit'
        });
        await newTransaction.save();
        return res.json({ success: true, data: null });
    } catch (err) {
        console.error("Error adding money to wallet:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
