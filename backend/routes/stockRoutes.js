// routes/stockRoutes.js

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const { publishOrder } = require("../config/rabbitmq");
const authenticateToken = require("../middleware/authMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const stockController = require("../controllers/stockController");
const stockManagementController = require("../controllers/stockManagementController");
const Order = require("../models/Order");
const { v4: uuidv4 } = require("uuid");
const Stock = require("../models/Stock");

router.use(authMiddleware);

router.get("/transaction/getStockTransactions", stockController.getStockTransactions);
router.post("/setup/createStock", stockManagementController.createStock);
router.get("/transaction/getStockPortfolio", stockManagementController.getStockPortfolio);
router.post("/setup/addStockToUser", stockManagementController.addStockToUser);
router.post("/transaction/UpdateStockPortfolio", stockManagementController.updateStockPortfolio);

// /placeStockOrder endpoint
router.post("/engine/placeStockOrder", authenticateToken, async (req, res) => {
    try {
        let { stock_id, is_buy, order_type, quantity, price } = req.body;

        // Validate required fields
        if (!stock_id || typeof is_buy === "undefined" || !order_type || !quantity) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Only accept BUY/MARKET and SELL/LIMIT
        if ((is_buy && order_type !== "MARKET") || (!is_buy && order_type !== "LIMIT")) {
            return res.status(400).json({ success: false, message: "Invalid order type: BUY must be MARKET, SELL must be LIMIT" });
        }

        const newOrder = new Order({
          user_id: req.user.id, // Attach authenticated user ID
          stock_id, // Ensure stock_id is ObjectId
          stock_tx_id: uuidv4(), // Ensure stock_tx_id is ObjectId
          is_buy,
          order_type,
          quantity,
          stock_price: is_buy ? null : price, // BUY/MARKET has no price
          order_status: "IN_PROGRESS",
          created_at: new Date(),
          parent_stock_tx_id: null,
          wallet_tx_id: null
        });

        // Insert the order into MongoDB
        // const result = await db.collection("orders").insertOne(newOrder);
        // newOrder._id = result.insertedId; // Store generated MongoDB ID
        await newOrder.save();

        // Publish the order to RabbitMQ for async processing by the matching engine

        console.log("Order placed:", newOrder);

        if (is_buy) {
          // Find the lowest sell orders
          const lowestSellOrders = await Order.find({
            stock_id,
            is_buy: false,
            order_status: "IN_PROGRESS",
          })
            .sort({ stock_price: 1 })
            .limit(1);
          console.log("Lowest sell orders:", lowestSellOrders); // Debugging
          if (lowestSellOrders.length === 0) {
            await Order.updateOne(
              { stock_tx_id: newOrder.stock_tx_id },
              { $set: { order_status: "CANCELLED" } }
            );
            return res.json({ success: true, data: newOrder });
          }

          const lowestPrice = lowestSellOrders[0].stock_price;
          console.log("Lowest price:", lowestPrice); // Debugging
          const sellOrders = await Order.find({
            stock_id,
            is_buy: false,
            order_status: "IN_PROGRESS",
            stock_price: lowestPrice,
          });
          console.log("Sell orders at lowest price:", sellOrders); // Debugging

          let totalAvailable = 0;
          for (const sellOrder of sellOrders) {
            totalAvailable += sellOrder.quantity;
          }
          console.log("Total available:", totalAvailable); // Debugging
          if (totalAvailable < quantity) {
            await Order.updateOne(
              { stock_tx_id: newOrder.stock_tx_id },
              { $set: { order_status: "CANCELLED" } }
            );
            return res.json({ success: true, data: newOrder });
          }
          // Loop through list of sell orders and match with buy order
          for (let sellOrder of sellOrders) {
            if (quantity === 0) {
              break;
            }
            if (sellOrder.quantity <= quantity) {
              quantity -= sellOrder.quantity;
              await Order.updateOne(
                { stock_tx_id: sellOrder.stock_tx_id },
                { $set: { order_status: "COMPLETED" } }
              );
            } else {
              await Order.updateOne(
                { stock_tx_id: sellOrder.stock_tx_id },
                { $set: { quantity: sellOrder.quantity - quantity } }
              );
              quantity = 0;
            }
          }

          if (quantity === 0) {
            await Order.updateOne(
              { stock_tx_id: newOrder.stock_tx_id },
              { $set: { order_status: "COMPLETED", stock_price: lowestPrice } }
            );
          }
        }

        await axios.post(
          `${req.protocol}://${req.get(
            "host"
          )}/transaction/UpdateStockPortfolio`,
          {
            user_id: newOrder.user_id,
            stock_id: newOrder.stock_id,
            quantity: newOrder.quantity, // Adjust quantity based on buy/sell
            is_buy: is_buy,
          },
          {
            headers: {
              token: req.headers.token, // Pass the authorization header
            },
          }
        );

        res.json({ success: true, data: newOrder });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// /getStockPrices/ endpoint
router.get("/transaction/getStockPrices", authenticateToken, async (req, res) => {
    try {
        const db = require("mongoose").connection.db;

        // Fetch all stocks from the 'stocks' collection
        const stocks = await db.collection("stocks")
            .find({})
            .sort({ stock_name: -1 }) // Sort by stock name (Z -> A)
            .toArray();

        // Iterate through stocks and fetch the lowest sell order price for each stock
        for (const stock of stocks) {
            const lowestSellOrder = await db
              .collection("orders")
              .find({
                stock_id: stock._id.toString(),
                is_buy: false,
                order_status: "IN_PROGRESS",
              })
              .sort({ stock_price: 1 }) // Sort by price ascending
              .limit(1)
              .toArray();

            // Set the current price from the lowest sell order if available
            stock.current_price = lowestSellOrder.length > 0 ? lowestSellOrder[0].stock_price : null;
            stock.stock_id = stock._id.toString();
            delete stock._id; // Remove the default _id field to match expected response
        }

        res.status(200).json({ success: true, data: stocks });
    } catch (error) {
        console.error("Error fetching stock prices:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


// /getSellOrders/ endpoint, for internal use if we choose to use it, not to be tested by TAs
router.get("/getSellOrders/:stock_id", authenticateToken, async (req, res) => {
    try {
        const { stock_id } = req.params;
        const db = require("mongoose").connection.db;

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
        const db = require("mongoose").connection.db;

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
        const db = require("mongoose").connection.db;

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

// /engine/cancelStockTransaction endpoint
router.post("/engine/cancelStockTransaction", authenticateToken, async (req, res) => {
    try {
        const { stock_tx_id } = req.body;
        
        const order = await Order.findOne({ stock_tx_id: stock_tx_id });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.order_status !== "IN_PROGRESS") {
            return res.status(400).json({ success: false, message: "Cannot cancel a completed or already canceled order" });
        }

        await Order.updateOne(
            { stock_tx_id: stock_tx_id },
            { $set: { order_status: "CANCELLED" } }
        );

        res.json({ success: true, message: "Order successfully canceled." });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// router.get("/setup/getStockName", authenticateToken, async (req, res) => {
//     try {
//         const { stock_id } = req.body;
//         const stock = await Stock.findById(stock_id);
//         if (!stock) {
//             return res.status(404).json({ success: false, message: "Stock not found" });
//         }
//         res.json({ success: true, data: stock.stock_name });
//     } catch (error) {
//         console.error("Error fetching stock name:", error);
//         res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// });

module.exports = router;
