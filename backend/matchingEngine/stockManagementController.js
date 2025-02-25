// controllers/stockManagementController.js
// manage stock transactions

const Stock = require('../models/Stock');
const UserHeldStock = require('../models/UserHeldStock');

/**
 * Create a new stock.
 * POST /api/stocks/createStock
 */
exports.createStock = async (req, res) => {
  const { stock_name } = req.body;
  if (!stock_name) {
    return res.status(400).json({ success: false, data: { error: "Stock name required" } });
  }
  try {
    const stockExists = await Stock.findOne({ stock_name });
    if (stockExists) {
      return res.status(409).json({ success: false, data: { error: "Duplicate stock found" } });
    }

    const newStock = new Stock({ stock_name, current_price: 0 });
    await newStock.save();
    return res.json({ success: true, data: { stock_id: newStock._id } });
  } catch (err) {
    return res.status(500).json({ success: false, data: { error: err.message } });
  }
};

/**
 * Get the stock portfolio for the logged-in user.
 * GET /api/stocks/getStockPortfolio
 */
exports.getStockPortfolio = async (req, res) => {
  try {
    const stocks = await UserHeldStock.find({ user_id: req.user.id });
    return res.json({ success: true, data: stocks });
  } catch (err) {
    return res.status(500).json({ success: false, data: { error: err.message } });
  }
};

exports.updateStockPortfolio = async (req, res) => {
  try {
    const {user_id, stock_id, quantity, is_buy} = req.body;
    console.log("user id: ", user_id);
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

/**
 * Add stock to a user’s portfolio.
 * POST /api/stocks/addStockToUser
 */
exports.addStockToUser = async (req, res) => {
  const { stock_id, quantity } = req.body;

  if (!stock_id || !quantity) {
    return res.status(400).json({ success: false, data: { error: "Stock ID & quantity required" } });
  }

  try {
    const stockExists = await Stock.findById(stock_id);
    if (!stockExists) {
      return res.status(404).json({ success: false, data: { error: "Stock not found" } });
    }

    let userStock = await UserHeldStock.findOne({ user_id: req.user.id, stock_id });
    if (userStock) {
      userStock.quantity_owned += quantity;
      await userStock.save();
    } else {
      userStock = new UserHeldStock({
        user_id: req.user.id,
        stock_id,
        stock_name: stockExists.stock_name,
        quantity_owned: quantity,
        updated_at: new Date()
      });
      await userStock.save();
    }

    return res.json({ success: true, data: null });
  } catch (err) {
    return res.status(500).json({ success: false, data: { error: err.message } });
  }
};
