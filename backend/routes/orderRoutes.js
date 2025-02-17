const express = require("express");
const router = express.Router();
const { connectDB } = require("../config/db");
const { publishOrder } = require("../config/rabbitmq");

// POST API to place a new stock order
router.post("/placeStockOrder", async (req, res) => {
    try {
        const { stock_id, is_buy, order_type, quantity, price } = req.body;
        const db = await connectDB(); // Get MongoDB instance

        // Create a new order object
        const newOrder = {
            stock_id,
            is_buy,
            order_type,
            quantity,
            price,
            status: "IN_PROGRESS",
            created_at: new Date()
        };

        // Insert order into MongoDB
        const result = await db.collection("orders").insertOne(newOrder);
        newOrder._id = result.insertedId; // Store generated MongoDB ID

        // Publish order to RabbitMQ for async processing
        await publishOrder(newOrder);

        res.json({ success: true, data: newOrder });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Export the route for use in Express
module.exports = router;
