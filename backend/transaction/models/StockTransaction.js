/**
 * **./models/StockTransaction.js**
 * 
 * - **Purpose:** Defines the schema for stock transactions in MongoDB.
 * - **Schema Fields:**
 *   - `userId`: References the `User` model (required).
 *   - `stockId`: References the `Stock` model (required).
 *   - `walletTransactionId`: References the `WalletTransaction` model (optional).
 *   - `isBuy`: Boolean flag indicating if it's a buy transaction (required).
 *   - `orderType`: Can be `MARKET` or `LIMIT` (required).
 *   - `stockPrice`: Number indicating the transaction price (required).
 *   - `quantity`: Number of stocks involved in the transaction (required).
 *   - `orderStatus`: Transaction status (`IN_PROGRESS`, `PARTIALLY_COMPLETE`, `COMPLETED`, `CANCELLED`).
 *   - `timeStamp`: Date of the transaction (defaults to current date).
 *   - `parentStockTxId`: References another `StockTransaction` (optional).
 * - **Usage:**
 *   - This model is imported in `./controllers/stockController.js`.
 *   - Used to query stock transactions when `/api/stockTransactions` is requested in `index.js`.
 * - **Exports:**
 *   - `StockTransaction`: Mongoose model for interacting with the `stocktransactions` collection in MongoDB.
 */

const mongoose = require('mongoose');

const StockTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
    walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction', default: null },
    isBuy: { type: Boolean, required: true },
    orderType: { type: String, enum: ['MARKET', 'LIMIT'], required: true },
    stockPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    orderStatus: { type: String, enum: ['IN_PROGRESS', 'PARTIALLY_COMPLETE', 'COMPLETED', 'CANCELLED'], default: 'IN_PROGRESS' },
    timeStamp: { type: Date, default: Date.now },
    parentStockTxId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockTransaction', default: null }
});

module.exports = mongoose.model('StockTransaction', StockTransactionSchema);
