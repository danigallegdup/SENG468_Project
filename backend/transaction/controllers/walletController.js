/**
 * **./controllers/walletController.js**
 */

const redisClient = require("./redis");
const { v4: uuidv4 } = require("uuid"); 

// /transaction/getWalletTransactions
exports.getWalletTransactions = async (req, res) => {
    try {

        const transactions = await redisClient.zrange(
            `wallet_transactions:${req.user.id}`,
            0,
            -1
        );

        const parsedTransactions = transactions.map(tx => JSON.parse(tx));

        if (!parsedTransactions.length) {
            console.log("No wallet transactions found.");
            return res.status(200).json({ success: true, message: "No transactions available.", data: [] });
        }

        console.log("✅ Wallet transactions retrieved successfully.");
        res.json({ success: true, data: parsedTransactions });
    } catch (err) {
        console.error("❌ Error fetching wallet transactions:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// /transaction/addMoneyToWallet
exports.addMoneyToWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a positive number"
            });
        }

        const userWalletKey = `wallet:${req.user.id}`;

        // Retrieve existing balance, default to 0 if not found
        let currentBalance = await redisClient.hget(userWalletKey, "balance");
        currentBalance = currentBalance ? parseFloat(currentBalance) : 0;

        // New balance after adding money
        const newBalance = currentBalance + amount;

        // Update Redis wallet balance
        await redisClient.hset(userWalletKey, "balance", newBalance);


        return res.json({ success: true, data: null });

    } catch (err) {
        console.error("❌ Error adding money to wallet:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// /transaction/updateWallet
exports.updateWallet = async (req) => {
    try {
        const { user_id, amount, is_buy, stock_tx_id } = req;
        console.log(`🔄 Updating wallet for user ${user_id}, amount: ${amount}, is_buy: ${is_buy}`);

        if (typeof is_buy === 'undefined' || typeof user_id === 'undefined') {
            console.log("❌ Invalid parameters for updateWallet.");
            return null;
        }
  
        // Get the user's current balance
        let balance = await redisClient.hget(`wallet:${user_id}`, "balance");
        balance = parseFloat(balance || 0);

        if (is_buy && balance < amount) {
            console.log("❌ Insufficient funds for withdrawal.");
            return null; // Not enough funds
        }

        const newBalance = is_buy ? balance - amount : balance + amount;
        await redisClient.hset(`wallet:${user_id}`, "balance", newBalance);

        // Log transaction in Redis Sorted Set
        const wallet_tx_id = uuidv4(); // Unique transaction ID
        const timestamp = Date.now();

        const transaction = {
            wallet_tx_id,
            user_id,
            stock_tx_id,
            amount,
            is_debit: is_buy ? "true" : "false",
            time_stamp: new Date().toISOString()
        };

        await redisClient.zadd(`wallet_transactions:${user_id}`, timestamp, JSON.stringify(transaction));

        console.log(`✅ Logged wallet transaction for user ${user_id}: `, transaction);

        return transaction;
    } catch (err) {
        console.error("❌ Error updating wallet:", err);
        return null;
    }
};

// /transaction/getWalletBalance
exports.getWalletBalance = async (req, res) => {
  try {
      const balance = await redisClient.hget(`wallet:${req.user.id}`, "balance") || "0";
      return res.json({ success: true, data: { balance } });
  } catch (err) {
      console.error("❌ Error fetching wallet balance:", err);
      return res.status(500).json({ success: false, message: "Server error" });
  }
};
