// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const StockTransaction = require('../models/StockTransaction');
const Stock = require('../models/Stock');
const UserHeldStock = require('../models/UserHeldStock');
const authMiddleware = require('../middleware/authMiddleware');

// Get all stock transactions for a user
router.get('/getStockTransactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await StockTransaction.find({ userId: req.user.id }).sort({ timeStamp: 1 });
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// createStock endpoint
router.post("/createStock", authMiddleware, async (req, res) => {
    const { stock_name } = req.body;
    if (!stock_name) return res.status(400).json({ success: false, data: { error: "Stock name required" } });

    try {
        //Check to make sure no duplicate stocks can be created
        const stockExists = await Stock.findOne({ stock_name: stock_name });
        if (stockExists) return res.status(409).json({ success: false, data: { error: "Duplicate stock found" } });

        const result = await Stock.insertOne({ stock_name });
        res.json({ success: true, data: { stock_id: result.insertedId } });
    } catch (err) {
        res.status(500).json({ success: false, data: { error: err.message } });
    }
});

// getStockPortfolio endpoint
router.get("/getStockPortfolio", authMiddleware, async (req, res) => {
    try {
        // Fetch only the stocks that belong to the authenticated user
        const stocks = await UserHeldStock.find({ user_id: req.user.id }).toArray();
        
        res.json({success: true, data: {stocks} });
    } catch (err) {
        res.status(500).json({ success: false, data: { error: err.message } });
    }
});

// addStockToUser endpoint
router.post("/addStockToUser", authMiddleware, async (req, res) => {
    const { stock_id, quantity } = req.body;
    if (!stock_id || !quantity) return res.status(400).json({ error: "Stock ID & quantity required" });

    try {
        // Check to ensure stock exists
        const stockExists = await Stock.findOne({ _id: new ObjectId(stock_id) });
        if (!stockExists) return res.status(404).json({ success: false, data: { error: "Stock not found" } });

        // Check if stock already exists in the user's portfolio
        const stockAlreadyInPortfolio = await UserHeldStock.findOne({ user_id: req.user.id, stock_id });

        if (stockAlreadyInPortfolio) {
            // Update the existing stock entry by adding the quantity
            await UserHeldStock.updateOne(
                { user_id: req.user.id, stock_id },
                { $inc: { quantity } } // This increments the existing entry automatically
            );
        } else {
            // Insert new stock entry
            await UserHeldStock.insertOne({ user_id: req.user.id, stock_id, quantity });
        }
        res.json({ success: true, data: null });
    } catch (err) {
        res.status(500).json({ success: false, data: { error: err.message } });
    }
});

module.exports = router;
