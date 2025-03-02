/**
 * **./controllers/walletController.js**
 * 
 * - **Purpose:** Handles fetching wallet transactions from the database.
 * - **Functionality:**
 *   - Queries the `WalletTransaction` model to retrieve all wallet transactions.
 *   - Sorts transactions in ascending order by `timeStamp`.
 *   - Returns transactions in JSON format.
 * - **Logging:**
 *   - Logs when fetching starts.
 *   - Logs if no transactions are found.
 *   - Logs successful retrieval of transactions.
 * - **Error Handling:**
 *   - Catches database errors.
 *   - Returns a `500` status with an error message if fetching fails.
 * - **Exports:**
 *   - `getWalletTransactions`: Called in `index.js` when `/api/walletTransactions` is requested.
 */


const WalletTransaction = require("../models/WalletTransaction");

exports.getWalletTransactions = async (req, res) => {
  try {
    console.log("controllers/walletController.js: Fetching wallet transactions...");

    const transactions = await WalletTransaction.find().sort({ timeStamp: 1 });

    if (!transactions.length) {
      console.log("controllers/walletController.js: No wallet transactions found.");
      return res.status(200).json({ success: true, message: "No transactions available.", data: [] });
    }

    console.log("controllers/walletController.js: Wallet transactions retrieved successfully.");
    res.json({ success: true, data: transactions });

  } catch (err) {
    console.error("controllers/walletController.js: Error fetching wallet transactions:", err.message);
    res.status(500).json({ success: false, message: "Server error while fetching wallet transactions." });
  }
};
