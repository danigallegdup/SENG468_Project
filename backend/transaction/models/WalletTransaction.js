/**
 * **./models/WalletTransaction.js**
 * 
 * - **Purpose:** Defines the schema for wallet transactions in MongoDB.
 * - **Schema Fields:**
 *   - `userId`: References the `User` model (required).
 *   - `amount`: Numeric value representing the transaction amount (required).
 *   - `type`: Can be either `deposit` or `withdrawal` (required).
 *   - `stock_tx_id`: String reference to a related stock transaction, if applicable (optional).
 *   - `wallet_tx_id`: String identifier for the wallet transaction (optional).
 *   - `is_debit`: Boolean indicating whether the transaction is a debit (defaults to `true`).
 *   - `timeStamp`: Date and time of the transaction (defaults to the current date).
 *   - `balance`: Numeric value representing the user's balance after this transaction (required).
 * - **Usage:**
 *   - This model is imported in `./controllers/walletController.js`.
 *   - Used in `index.js` when handling requests to `/api/walletTransactions`.
 * - **Exports:**
 *   - `WalletTransaction`: Mongoose model for interacting with the `wallettransactions` collection in MongoDB.
 */

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
