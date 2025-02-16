const mongoose = require("mongoose");

const WalletTransactionSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Change ObjectId to String
    userId: { type: String, required: true }, // Change ObjectId to String
    amount: Number,
    type: String,
    timeStamp: String,
});

module.exports = mongoose.model("WalletTransaction", WalletTransactionSchema);
