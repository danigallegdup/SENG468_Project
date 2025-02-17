/**
 * getWalletTransactions
 * getWalletBalance
 * addMoneyToWallet
 */


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

/**
 * @desc    Retrieve wallet balance for the logged-in user
 * @route   GET /getWalletBalance
 * @return  { success: true, data: { balance: <computed_balance> } }
 */
exports.getWalletBalance = async (req, res) => {
    try {
        const transactions = await WalletTransaction.find({ userId: req.user.id });
        let balance = 0;

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


/**
 * @desc    Update the wallet after an order is complete (buy/sell)
 * @route   POST /updateWallet
 * @body    { amount: Number, type: 'deposit' | 'withdrawal', orderStatus: String }
 *          (orderStatus should be 'COMPLETED' to trigger the update)
 * @return  { success: true, data: null }
 */
exports.updateWallet = async (req, res) => {
    try {
        const { amount, type, orderStatus } = req.body;
        if (orderStatus !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                data: { error: "Order is not completed; wallet not updated" }
            });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                data: { error: "Amount must be a positive number" }
            });
        }
        if (!['deposit', 'withdrawal'].includes(type)) {
            return res.status(400).json({
                success: false,
                data: { error: "Invalid transaction type" }
            });
        }

        const lastTransaction = await WalletTransaction.findOne({ userId: req.user.id }).sort({ timeStamp: -1 });
        const currentBalance = lastTransaction ? lastTransaction.balance : 0;

        let newBalance = type === 'deposit'
            ? currentBalance + amount
            : currentBalance - amount;

        const newTransaction = new WalletTransaction({
            userId: req.user.id,
            amount,
            type,
            balance: newBalance,
        });
        await newTransaction.save();

        return res.json({ success: true, data: null });
    } catch (err) {
        console.error("Error updating wallet:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
