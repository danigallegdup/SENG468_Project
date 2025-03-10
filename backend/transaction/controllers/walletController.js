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
const Wallet = require("../models/Wallet");
exports.getWalletTransactions = async (req, res) => {
    try {
        console.log(`Fetching wallet transactions for user: ${req.user.id}`);
        const transactions = await WalletTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });
        if (!transactions.length) {
            console.log("No wallet transactions found.");
            return res.status(200).json({ success: true, message: "No transactions available.", data: [] });
        }
        console.log("Wallet transactions retrieved successfully.");
        res.json({ success: true, data: transactions });
    } catch (err) {
        console.error("Error fetching wallet transactions:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.addMoneyToWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                data: { error: "amount must be a positive number" }
            });
        }
        // Retrieve the current balance from the most recent transaction.
        const lastTransaction = await WalletTransaction.findOne({ userId: req.user.id })
            .sort({ timeStamp: 'desc' })
            .exec();
        const currentBalance = lastTransaction ? lastTransaction.balance : 0;
        const newBalance = currentBalance + amount;
  
        const newTransaction = new Wallet({
            userId: req.user.id,
            balance: newBalance,
            timeStamp: new Date() // Set the actual timestamp when the transaction is made.
        });
        await newTransaction.save();
        return res.json({ success: true, data: null });
    } catch (err) {
        console.error("Error adding money to wallet:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.updateWallet = async (req) => {
    try {
        const { user_id, amount, is_buy, stock_tx_id, wallet_tx_id } = req;

        if (typeof is_buy === 'undefined') {
            return null;
        }

        if (typeof user_id === 'undefined') {
            return null;
        }
  
        console.log("Updating the wallet of user ", user_id);
        console.log("Updating wallet for stock_tx_id ", stock_tx_id);
        // Get the current balance from the most recent transaction using the actual timestamp.
        const lastTransaction = await Wallet.findOne({ userId: user_id })
            .sort({ timeStamp: 'desc' })
            .exec();
        const currentBalance = lastTransaction ? lastTransaction.balance : 0;
        console.log("Current balance: ", currentBalance);

        let newBalance;
        let isDebit;
        if (is_buy) {
            // Buy order: deduct funds.
            if (currentBalance-amount < 0) {
                return null
            }
            newBalance = currentBalance - amount;
            transactionType = 'withdrawal';
            isDebit = true;
        } else {
            newBalance = currentBalance + amount;
            transactionType = "deposit";
            isDebit = false;
        }

        console.log("lastTransaction: ", lastTransaction);
        console.log("newBalance: ", newBalance);
        if (lastTransaction) {
            lastTransaction.balance = newBalance;
            await lastTransaction.save();
        } else {
            // Create a new wallet transaction for the user
            const newWalletEntry = new Wallet({
                userId: user_id,
                balance: newBalance,
                timeStamp: new Date()
            });
            await newWalletEntry.save();
        }
        
  
        const newTransaction = new WalletTransaction({
            userId: user_id,
            amount,
            type: transactionType,
            balance: newBalance,
            stock_tx_id,
            is_debit: isDebit,
            wallet_tx_id,
            timeStamp: new Date() // Actual timestamp when the transaction is made.
        });

        console.log("New balance: ", newBalance);
        console.log("Saving newTransaction to database: ", newTransaction);

        await newTransaction.save();
        return newTransaction;
    } catch (err) {
        console.error("Error updating wallet:", err);
        return null;
    }
};

exports.getWalletBalance = async (req, res) => {
  try {
          // Fetch the latest transaction by sorting with the actual timestamp in descending order.
          const lastTransaction = await Wallet.findOne({ userId: req.user.id })
              .sort({ timeStamp: 'desc' })
              .exec();
          const balance = lastTransaction ? lastTransaction.balance : 0;
          return res.json({ success: true, data: { balance } });
      } catch (err) {
          console.error("Error fetching wallet balance:", err);
          return res.status(500).json({ success: false, message: "Server error" });
      }
};