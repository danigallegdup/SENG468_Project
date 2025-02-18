const express = require("express");
const router = express.Router();
const connectDB = require("../config/db");
const { publishOrder } = require("../config/rabbitmq");
const authenticateToken = require("../middleware/authMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const stockController = require("../controllers/stockController");
const stockManagementController = require("../controllers/stockManagementController");

router.use(authMiddleware);

router.get("/getStockTransactions", stockController.getStockTransactions);
router.post("/setup/createStock", stockManagementController.createStock);
router.get("/transaction/getStockPortfolio", stockManagementController.getStockPortfolio);
router.post("/setup/addStockToUser", stockManagementController.addStockToUser);

// /placeStockOrder endpoint
router.post("/engine/placeStockOrder", authenticateToken, async (req, res) => {
    try {
        const { stock_id, is_buy, order_type, quantity, price } = req.body;
        const db = await connectDB(); // Get MongoDB instance

        // Validate required fields
        if (!stock_id || typeof is_buy === "undefined" || !order_type || !quantity) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Only accept BUY/MARKET and SELL/LIMIT
        if ((is_buy && order_type !== "MARKET") || (!is_buy && order_type !== "LIMIT")) {
            return res.status(400).json({ success: false, message: "Invalid order type: BUY must be MARKET, SELL must be LIMIT" });
        }

        // Construct a new order object
        const newOrder = {
            user_id: req.user.id, // Attach authenticated user ID
            stock_id,
            is_buy,
            order_type,
            quantity,
            price: is_buy ? null : price, // BUY/MARKET has no price
            status: "IN_PROGRESS",
            created_at: new Date()
        };

        // Insert the order into MongoDB
        const result = await db.collection("orders").insertOne(newOrder);
        newOrder._id = result.insertedId; // Store generated MongoDB ID

        // Publish the order to RabbitMQ for async processing by the matching engine
        await publishOrder(newOrder);

        res.json({ success: true, data: newOrder });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// /getStockPrices/ endpoint
router.get("/transaction/getStockPrices", authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const stocks = await db.collection("stocks").find({}).toArray();

        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error("Error fetching stock prices:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// /getSellOrders/ endpoint, for internal use if we choose to use it, not to be tested by TAs
router.get("/getSellOrders/:stock_id", authenticateToken, async (req, res) => {
    try {
        const { stock_id } = req.params;
        const db = await connectDB();

        const sellOrders = await db.collection("orders")
            .find({ stock_id, is_buy: false, status: "IN_PROGRESS" })
            .sort({ price: 1 }) // Lowest price first
            .toArray();

        res.json({ success: true, data: sellOrders });
    } catch (error) {
        console.error("Error fetching sell orders:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// /getBuyOrders endpoint, for internal use if we choose to use it, not to be tested by TAs
router.get("/getBuyOrders/:stock_id", authenticateToken, async (req, res) => {
    try {
        const { stock_id } = req.params;
        const db = await connectDB();

        const buyOrders = await db.collection("orders")
            .find({ stock_id, is_buy: true, status: "IN_PROGRESS" })
            .sort({ price: -1 }) // Highest price first
            .toArray();

        res.json({ success: true, data: buyOrders });
    } catch (error) {
        console.error("Error fetching buy orders:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// /getOrderStatus endpoint, for internal use if we choose to use it, not to be tested by TAs
router.get("/getOrderStatus/:order_id", authenticateToken, async (req, res) => {
    try {
        const { order_id } = req.params;
        const db = await connectDB();

        const order = await db.collection("orders").findOne({ _id: order_id });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error("Error fetching order status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// /cancel/Order endpoint, for internal use if we chopse to use it, not to be tested by TAs
router.delete("/engine/cancelStockTransaction", authenticateToken, async (req, res) => {
    try {
        const { order_id } = req.body;
        const db = await connectDB();

        const order = await db.collection("orders").findOne({ _id: order_id });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.status !== "IN_PROGRESS") {
            return res.status(400).json({ success: false, message: "Cannot cancel a completed or already canceled order" });
        }

        // Update order status to "CANCELED"
        await db.collection("orders").updateOne({ _id: order_id }, { $set: { status: "CANCELED" } });

        res.json({ success: true, message: "Order successfully canceled." });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;
