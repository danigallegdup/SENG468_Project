const redisClient = require("./redis");

/**
 * **stockController.js**
 * Handles fetching stock transactions using Redis.
 */

/**
 * Fetches stock transactions for a user from Redis.
 */
exports.getStockTransactions = async (req, res) => {
  try {
    console.log(`Fetching stock transactions for user: ${req.user.id}`);

    const transactions = await redisClient.zrange(`stock_transactions:${req.user.id}`, 0, -1);
    if (!transactions.length) {
      return res.json({ success: true, message: "No stock transactions available.", data: [] });
    }

    const parsedTransactions = transactions.map(tx => JSON.parse(tx));
    res.json({ success: true, data: parsedTransactions });

  } catch (err) {
    console.error("Error fetching stock transactions:", err.message);
    res.status(500).json({ success: false, message: "Server error while fetching stock transactions." });
  }
};

/**
 * Updates stock portfolio in Redis.
 */
exports.updateStockPortfolio = async ({ user_id, stock_id, quantity, is_buy }) => {
  try {
    console.log(`Updating stock portfolio for user ${user_id}, stock: ${stock_id}`);

    let userStock = await redisClient.zscore(`stock_portfolio:${user_id}`, stock_id);
    userStock = userStock ? parseInt(userStock) : 0;

    const newQuantity = is_buy ? userStock + quantity : userStock - quantity;

    if (newQuantity <= 0) {
      await redisClient.zrem(`stock_portfolio:${user_id}`, stock_id);
    } else {
      await redisClient.zadd(`stock_portfolio:${user_id}`, newQuantity, stock_id);
    }

    console.log(`Portfolio updated for user ${user_id} and stock ${stock_id}`);
    return "success";

  } catch (err) {
    console.error("Error updating stock portfolio:", err);
    return null;
  }
};

/**
 * Fetches stock portfolio from Redis.
 */
exports.getStockPortfolio = async (req, res) => {
  try {
    console.log(`Fetching stock portfolio for user: ${req.user.id}`);

    // Fetch all stocks sorted by quantity (ascending)
    const stockData = await redisClient.zrevrange(`stock_portfolio:${req.user.id}`, 0, -1, "WITHSCORES");

    if (!stockData.length) {
      return res.json({ success: true, message: "No stocks owned.", data: [] });
    }

    // Extract stock IDs and fetch names
    const stockIds = stockData.filter((_, i) => i % 2 === 0);
    const stockMap = await getStockNames(stockIds);

    // Build response array
    const portfolio = [];
    for (let i = 0; i < stockData.length; i += 2) {
      portfolio.push({
        stock_id: stockData[i],
        stock_name: stockMap[stockData[i]] || "Unknown",
        quantity_owned: parseInt(stockData[i + 1]),
      });
    }

    console.log("Portfolio:", portfolio);
    res.json({ success: true, data: portfolio });

  } catch (err) {
    console.error("❌ Error fetching stock portfolio:", err.message);
    res.status(500).json({ success: false, message: "Server error while fetching stock portfolio." });
  }
};


// getStockNames: Maps stockIds to stock names
// Helper function for getStockPrices
const getStockNames = async (stockIds) => {
  if (!Array.isArray(stockIds) || stockIds.length === 0) return {};

  try {
    const stockMap = {};  // Stores final stock name mappings

    // Use a pipeline to fetch all stock names in a single Redis call (efficient!)
    const pipeline = redisClient.multi();
    stockIds.forEach(stock_id => pipeline.hget(`stock:${stock_id}`, "stock_name"));
    const results = await pipeline.exec();

    // Process the results
    stockIds.forEach((stock_id, index) => {
      stockMap[stock_id] = results[index] ? results[index][1] || "Unknown" : "Unknown";
    });

    console.log("✅ Fetched stock names:", stockMap);
    return stockMap;

  } catch (error) {
    console.error("❌ Error fetching stock names from Redis:", error);
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
