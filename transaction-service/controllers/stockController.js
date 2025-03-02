/**
 * **./controllers/stockController.js**
 * 
 * - **Purpose:** Handles fetching stock transactions from the database.
 * - **Functionality:**
 *   - Queries the `StockTransaction` model to retrieve all stock transactions.
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
 *   - `getStockTransactions`: Called in `index.js` when `/api/stockTransactions` is requested.
 */


const StockTransaction = require("../models/StockTransaction");

exports.getStockTransactions = async (req, res) => {
  try {
    console.log("controllers/stockTransactionController.js: Fetching stock transactions...");

    const transactions = await StockTransaction.find().sort({ timeStamp: 1 });

    if (!transactions.length) {
      console.log("controllers/stockTransactionController.js: No stock transactions found.");
      return res.status(200).json({ success: true, message: "No transactions available.", data: [] });
    }

    console.log("controllers/stockTransactionController.js: Stock transactions retrieved successfully.");
    res.json({ success: true, data: transactions });

  } catch (err) {
    console.error("controllers/stockTransactionController.js: Error fetching stock transactions:", err.message);
    res.status(500).json({ success: false, message: "Server error while fetching stock transactions." });
  }
};
