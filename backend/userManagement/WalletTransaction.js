// /WalletTransaction.js
// Schema for wallet transactions, used for adding money to a wallet

const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    stock_tx_id: { type: String, default: null },
    wallet_tx_id: { type: String, default: null },
    is_debit: { type: Boolean, default: true },
    timeStamp: { type: Date, default: Date.now },
    balance: { type: Number, required: true }
});

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);
