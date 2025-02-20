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

exports.getWalletBalance = async (req, res) => {
    try {
        const lastTransaction = await WalletTransaction.findOne({ userId: req.user.id })
            .sort({ timeStamp: 'desc' })
            .exec();
        const balance = lastTransaction ? lastTransaction.balance : 0;
        return res.json({ success: true, data: { balance } });
    } catch (err) {
        console.error("Error fetching wallet balance:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.addMoneyToWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                data: { error: "Amount must be a positive number" }
            });
        }

        const lastTransaction = await WalletTransaction.findOne({ userId: req.user.id })
            .sort({ timeStamp: 'desc' })
            .exec();
        const currentBalance = lastTransaction ? lastTransaction.balance : 0;
        const newBalance = currentBalance + amount;
  
        const newTransaction = new WalletTransaction({
            userId: req.user.id,
            amount,
            type: 'deposit',
            balance: newBalance,
            timeStamp: new Date()
        });
        await newTransaction.save();
        return res.json({ success: true, data: null });
    } catch (err) {
        console.error("Error adding money to wallet:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

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
  
        const lastTransaction = await WalletTransaction.findOne({ userId: req.user.id })
            .sort({ timeStamp: 'desc' })
            .exec();
        const currentBalance = lastTransaction ? lastTransaction.balance : 0;
  
        const newBalance = type === 'deposit'
            ? currentBalance + amount
            : currentBalance - amount;
  
        const newTransaction = new WalletTransaction({
            userId: req.user.id,
            amount,
            type,
            balance: newBalance,
            timeStamp: new Date() 
        });
        await newTransaction.save();
        return res.json({ success: true, data: null });
    } catch (err) {
        console.error("Error updating wallet:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
