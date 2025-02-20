const StockTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
    walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction', default: null },
    isBuy: { type: Boolean, required: true },
    orderType: { type: String, enum: ['MARKET', 'LIMIT'], required: true },
    stockPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    orderStatus: { type: String, enum: ['IN_PROGRESS', 'PARTIALLY_COMPLETE', 'COMPLETED', 'CANCELLED'], default: 'IN_PROGRESS' },
    created_at: { type: Date, default: Date.now },  // renamed from timeStamp
    parentStockTxId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockTransaction', default: null }
});

module.exports = mongoose.model('StockTransaction', StockTransactionSchema);
