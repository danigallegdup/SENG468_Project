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
    console.log("user id: ", user_id);
    console.log("stock id", stock_id);
    console.log("quantity", quantity);
    console.log("is buy", is_buy);
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
      console.log("User stock not found, creating new");
      userStock = new UserHeldStock({
        user_id: req.user.id,
        stock_id,
        stock_name: stockName.stock_name,
        quantity_owned: 0,
        updated_at: new Date(),
      });
    }
    if (is_buy) {
      console.log("buying stock");
      userStock.quantity_owned = userStock.quantity_owned + quantity;
    } else {
      console.log("selling stock");
      userStock.quantity_owned = userStock.quantity_owned - quantity;
    }
    userStock.updated_at = new Date();
    console.log("user stock: ", userStock);
    if (userStock.quantity_owned <= 0) {
      await UserHeldStock.deleteOne({ _id: userStock._id });
      return res.json({ success: true, data: null });
    }
    await userStock.save();
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

exports.getStockPrices = async (req, res) => {
      try {  
          // Fetch all stocks from the 'stocks' collection
          let stocks = await Stock
              .find({})
              .sort({ stock_name: -1 });
  
          // Iterate through stocks and fetch the lowest sell order price for each stock
          for (let i = 0; i < stocks.length; i++) {
            let stock = stocks[i];
            console.log("Stock: ", stock);
              const lowestSellOrder = await Order
                .find({
                  stock_id: stock._id.toString(),
                  is_buy: false,
                  order_status: "IN_PROGRESS",
                })
                .sort({ stock_price: 1 }) // Sort by price ascending
                .limit(1);
  
              // Set the current price from the lowest sell order if available
              stock.current_price = lowestSellOrder.length > 0 ? lowestSellOrder[0].stock_price : null;
              await stock.save();
              console.log("Stock after: ", stock);
              stocks[i] = stock;
          }
  
          res.status(200).json({ success: true, data: stocks });
      } catch (error) {
          console.error("Error fetching stock prices:", error);
          res.status(500).json({ success: false, message: "Internal Server Error" });
      }
};