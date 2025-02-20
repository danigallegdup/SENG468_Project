// models/WalletTransaction.js
const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    stock_tx_id: { type: String, default: null }, 
    wallet_tx_id: { type: String, default: null }, 
    is_debit: { type: Boolean, default: null },
    timeStamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);
