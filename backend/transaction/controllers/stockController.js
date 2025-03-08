/**
 * **./controllers/stockController.js**
 * 
 * - **Purpose:** Handles fetching stock transactions from the database.
 * - **Functionality:**
 *   - Queries the `Order` model to retrieve all stock transactions.
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
 *   - `getOrders`: Called in `index.js` when `/api/Orders` is requested.
 */


const Order = require("../models/Order");
const UserHeldStock = require("../models/UserHeldStock");
const Stock = require("../models/Stock");
const redisClient = require("./redis");

// Exports
exports.getStockTransactions = async (req, res) => {
  try {
    console.log("controllers/stockTransactionController.js: Fetching stock transactions...");

    const transactions = await Order.find({ user_id: req.user.id }).sort({
      timeStamp: 1,
    });

    if (!transactions.length) {
      console.log("controllers/stockTransactionController.js: No stock transactions found.");
      return res.status(200).json({ success: true, message: "No stock transactions available.", data: [] });
    }

    console.log("controllers/stockTransactionController.js: Stock transactions retrieved successfully.");
    res.json({ success: true, data: transactions });

  } catch (err) {
    console.error("controllers/stockTransactionController.js: Error fetching stock transactions:", err.message);
    res.status(500).json({ success: false, message: "Server error while fetching stock transactions." });
  }
};

exports.updateStockPortfolio = async (req, res) => {
  try {

    const {user_id, stock_id, quantity, is_buy} = req.body;

    if (is_buy) {
      console.log("Fulfilling buy order with updateStockPortfolio");
    }

    console.log("> Updating stock portfolio... ");
    console.log("> user id: ", user_id);
    console.log("> stock id:", stock_id);
    console.log("> quantity:", quantity);
    console.log("> is buy:", is_buy);

    let userStock = await UserHeldStock.findOne({ user_id, stock_id });
    console.log("user stock: ", userStock);

    const stockName = await Stock
      .findById(stock_id)
      .select("stock_name");
    console.log("stock name: ", stockName);

    if (!userStock && !is_buy) {
      console.log("User stock not found");
      return res
        .status(404)
        .json({ success: false, data: { error: "User stock not found" } });

    } else if (!userStock && is_buy) {
      console.log("User stock not found, creating new for UserHeldStock for: ", stockName);
      try {
        userStock = new UserHeldStock({
          user_id,
          stock_id,
          stock_name: stockName.stock_name,
          quantity_owned: 0,
          updated_at: new Date(),
        });
      } catch(err) {
        console.log("Couldn't create new userStock object: ", err);
      }

    }

    console.log("> userStock: ", userStock);

    if (is_buy) {
      console.log("updateStockPortfolio: buying stock");
      userStock.quantity_owned = userStock.quantity_owned + quantity;

    } else {
      console.log("updateStockPortfolio: selling stock");
      userStock.quantity_owned = userStock.quantity_owned - quantity;
    }

    userStock.updated_at = new Date();
    console.log("updateStockPortfolio/user stock: ", userStock);

    if (userStock.quantity_owned <= 0) {
      await UserHeldStock.deleteOne({ _id: userStock._id });
      return res.json({ success: true, data: null });
    }

    try {
      await userStock.save();
      console.log("Successfully updated stock portfolio.")
    } catch (err) {
      console.log("updateStockPortfolio couldn't save userStock to database.");
      return res
      .status(500)
      .json({ success: false, data: { error: "Update stock portfolio failed: "+ err.message } });
    }
    
    return res.json({ success: true, data: null });

  } catch (err) {
    return res
      .status(500)
      .json({ success: false, data: { error: "Update stock portfolio failed: "+ err.message } });
  }
}

exports.getStockPortfolio = async (req, res) => {
  try {
    const stocks = await UserHeldStock.find({ user_id: req.user.id });
    return res.json({ success: true, data: stocks });
  } catch (err) {
    return res.status(500).json({ success: false, data: { error: err.message } });
  }
};

// getStockNames: Maps stockIds to stock names
// Helper function for getStockPrices
const getStockNames = async (stockIds) => {
  if (!stockIds.length) return {};

  try {
    const stockMap = {};  // Stores final stock name mappings
    const missingStockIds = [];  // Tracks stock IDs not found in cache

    // Attempt to fetch stock names from Redis
    for (const stock_id of stockIds) {
      const cachedStockName = await redisClient.get(`stock_name:${stock_id}`);
      if (cachedStockName) {
        stockMap[stock_id] = cachedStockName;  // Use cached value
      } else {
        missingStockIds.push(stock_id);  // Mark as missing in cache
      }
    }

    // Fetch missing stock names from the database (only for uncached stocks)
    if (missingStockIds.length > 0) {
      const stocks = await Stock.find({ _id: { $in: missingStockIds } })
        .select("_id stock_name")
        .lean();

      // Store fetched stock names in Redis and in stockMap
      for (const stock of stocks) {
        stockMap[stock._id.toString()] = stock.stock_name;
        await redisClient.set(`stock_name:${stock._id}`, stock.stock_name, "EX", 3600);  // Cache for 1 hour
      }
    }

    return stockMap;
  } catch (error) {
    console.error("❌ Error fetching stock names:", error);
    return {};
  }
};


exports.getStockPrices = async (req, res) => {
  try {
    // Retrieve stock IDs in the correct order
    const stockIds = await redisClient.zrange('market_price_ordered', 0, -1);

    // Return empty data if no stocks
    if (!stockIds.length) {
      return res.json({ success: true, data: [] });
    }

    // Fetch stock names
    const stockMap = await getStockNames(stockIds);
    const prices = [];

    // Loop through each stock and fetch price
    for (const stock_id of stockIds) {
      const stock_name = stockMap[stock_id];

      // Remove stale stocks from cache
      if (!stock_name) {
        await redisClient.multi()
        .zrem('market_price_ordered', stock_id)
        .del(`market_price:${stock_id}`)
        .exec();
        continue;
      }

      // Fetch the stock price
      const price = parseFloat(await redisClient.get(`market_price:${stock_id}`));
      if (!isNaN(price)) {
        prices.push({ stock_id, stock_name, current_price: price });
      }
    }

    res.json({ success: true, data: prices });
  } catch (error) {
    console.error('❌ Error fetching stock prices:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
