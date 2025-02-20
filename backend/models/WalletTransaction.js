const WalletTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    stock_tx_id: { type: String, default: null },
    wallet_tx_id: { type: String, default: null },
    is_debit: { type: Boolean, default: null },
    created_at: { type: Date, default: Date.now },  // renamed from timeStamp
    balance: { type: Number, required: true }
});

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);
