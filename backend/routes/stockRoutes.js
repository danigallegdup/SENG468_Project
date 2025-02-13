const express = require("express");
const router = express.Router();
const { connectDB } = require("../config/Mongo_connect");
const { publishOrder } = require("../config/rabbitmq");


router.post("/placeStockOrder", async (req, res) => {
    try {
        const { stock_id, is_buy, order_type, quantity, price } = req.body;
        const db = await connectDB(); // Get MongoDB instance

        // Validate required fields
        if (!stock_id || typeof is_buy === "undefined" || !order_type || !quantity || !price) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Construct a new order object
        const newOrder = {
            stock_id,
            is_buy,
            order_type,
            quantity,
            price,
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

router.get("/getStockPrices", async (req, res) => {
    try {
        const db = await connectDB();
        const stocks = await db.collection("stocks").find({}).toArray();

        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error("Error fetching stock prices:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;
