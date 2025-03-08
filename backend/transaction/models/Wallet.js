// models/WalletTransaction.js
// Schema for user wallets

const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  timeStamp: { type: Date, default: Date.now },
  balance: { type: Number, required: false },
});

module.exports = mongoose.model('Wallet', WalletSchema);
