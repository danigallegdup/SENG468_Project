// controllers/walletController.js
const { getWalletTransactions } = require('../utils/tempDatabase');
console.log("getWalletTransactions:", getWalletTransactions);

exports.getWalletTransactions = async (req, res) => {
    try {
        const transactions = getWalletTransactions(req.user.id);
        console.log("Returning wallet transactions:", transactions);
        res.json({ success: true, data: transactions });
    } catch (err) {
        console.error("Error fetching wallet transactions:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
