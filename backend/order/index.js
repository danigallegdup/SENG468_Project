// backend/orderManagement/index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const authMiddleware = require("./authMiddleware"); // Import authMiddleware
const { publishOrder } = require("./matchingProducer"); // Import RabbitMQ producer
const redisClient = require("./redis"); // Import Redis
const { waitForOrderResponse } = require("./orderResponseConsumer");

const transactionServiceUrl = "http://api-gateway:8080/transaction";
const userManagementServiceUrl = "http://api-gateway:8080/setup";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).send("OK"));

app.get("/", (req, res) => {
  res.send("✅ Order Management Service is running!");
});

/**
 * ----------------------------------------------------------------
 * POST /orders/place
 * Place a new stock order (BUY MARKET or SELL LIMIT)
 * ----------------------------------------------------------------
 */
app.post("/placeStockOrder", authMiddleware, async (req, res) => {
  try {
    const { stock_id, is_buy, order_type, quantity, price } = req.body;
    const token = req.headers.token;

    if (!stock_id || typeof is_buy === "undefined" || !order_type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (stock_id, is_buy, order_type, quantity)",
      });
    }

    if ((is_buy && order_type !== "MARKET") || (!is_buy && order_type !== "LIMIT")) {
      return res.status(400).json({ success: false, message: "Invalid order type" });
    }

    if (!is_buy && (typeof price !== "number" || price <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Sell limit orders must include a valid positive price.",
      });
    }

    const stock_tx_id = uuidv4();
    const timestamp = Date.now();
    const newOrder = {
      user_id: req.user.id,
      stock_id,
      is_buy,
      order_type,
      quantity,
      stock_price: is_buy ? null : price,
      order_status: "IN_PROGRESS",
      created_at: timestamp,
      stock_tx_id,
      parent_stock_tx_id: null,
      wallet_tx_id: null,
      token,
    };

    const pipeline = redisClient.multi();

    console.log(`✅ Processing order for user: ${req.user.id}`);
    
    pipeline.zadd(`stock_transactions:${req.user.id}`, timestamp, JSON.stringify(newOrder));

    if (is_buy) {
      // BUY MARKET ORDER - Immediately publish to RabbitMQ
      publishOrder(newOrder);

      // Remove order from Redis after processing
      pipeline.zrem(`stock_transactions:${req.user.id}`, JSON.stringify(newOrder));

      console.log("✅ BUY order processed and published.");

    } else {
      // SELL LIMIT ORDER - Needs to be stored and matched later
      let sellerStockQuantity = await redisClient.zscore(`stock_portfolio:${newOrder.user_id}`, newOrder.stock_id);
      sellerStockQuantity = sellerStockQuantity ? parseInt(sellerStockQuantity) : 0;

      if (sellerStockQuantity < newOrder.quantity) {
        return res.status(400).json({ success: false, message: "Not enough stock to sell" });
      }

      // Update portfolio & store in sell orders
      const updatedSellerQuantity = sellerStockQuantity - newOrder.quantity;

      if (updatedSellerQuantity <= 0) {
        pipeline.zrem(`stock_portfolio:${newOrder.user_id}`, newOrder.stock_id);
      } else {
        pipeline.zadd(`stock_portfolio:${newOrder.user_id}`, updatedSellerQuantity, newOrder.stock_id);
      }

      pipeline.zadd(`sell_orders:${stock_id}`, price, JSON.stringify(newOrder));
      pipeline.expire(`sell_orders:${stock_id}`, 3600);

      // Market price update logic
      const currentLowestPrice = await redisClient.get(`market_price:${stock_id}`);

      if (!currentLowestPrice || price < parseFloat(currentLowestPrice)) {
        pipeline.set(`market_price:${stock_id}`, price, "EX", 3600);
        pipeline.zrem(`market_price_ordered`, stock_id);
        pipeline.zadd(`market_price_ordered`, timestamp, stock_id);
      }

      console.log("✅ SELL order added to queue.");
    }

    await pipeline.exec();
    res.status(200).json({ success: true, data: newOrder });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * ----------------------------------------------------------------
 * POST /orders/cancel
 * Cancel an order that is IN_PROGRESS
 * ----------------------------------------------------------------
 */
app.post("/cancelStockTransaction", authMiddleware, async (req, res) => {
  try {
    const { stock_tx_id } = req.body;
    if (!stock_tx_id) {
      return res.status(400).json({ success: false, message: "stock_tx_id is required" });
    }

    console.log("✅ Processing order cancellation:", stock_tx_id);

    const orderData = await redisClient.zrangebyscore(
      `stock_transactions:${req.user.id}`,
      "-inf",
      "+inf",
      "WITHSCORES"
    );

    const order = orderData
      .map(order => JSON.parse(order))
      .find(o => o.stock_tx_id === stock_tx_id);

    if (!order) {
      console.log(`⚠️ No matching order found for stock_tx_id: ${stock_tx_id}`);
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (["COMPLETED", "CANCELLED"].includes(order.order_status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed or already canceled order",
      });
    }

    const pipeline = redisClient.multi();

    pipeline.zrem(`stock_transactions:${req.user.id}`, JSON.stringify(order));

    const portfolioKey = `stock_portfolio:${order.user_id}`;
    let currentStockQuantity = await redisClient.zscore(portfolioKey, order.stock_id);
    currentStockQuantity = currentStockQuantity ? parseInt(currentStockQuantity) : 0;

    const restoredQuantity = currentStockQuantity + order.quantity;
    pipeline.zadd(portfolioKey, restoredQuantity, order.stock_id);

    const updatedOrder = { ...order, order_status: "CANCELLED" };
    pipeline.zadd(`stock_transactions:${req.user.id}`, order.quantity, JSON.stringify(updatedOrder));

    await pipeline.exec();

    console.log(`✅ Order ${stock_tx_id} successfully canceled.`);
    res.json({ success: true, message: "Order successfully canceled." });

  } catch (error) {
    console.error("❌ Error canceling order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

const PORT = process.env.ORDER_SERVICE_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Order Service running on port ${PORT}`);
});
