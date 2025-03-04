// backend/orderManagement/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const connectDB = require('./db');
const Order = require('./Order');
const { v4: uuidv4 } = require("uuid");

const authMiddleware = require('../middleware/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// Health-check route
app.get('/', (req, res) => {
  res.send('✅ Order Management Service is running!');
});

/**
 * ----------------------------------------------------------------
 * POST /orders/place
 * Place a new order
 * 
 * 1) Inserts the order into the DB => "See the order sent to DB"
 * 2) If the order is a BUY (MARKET), attempts a simple matching
 * 3) Once matched, calls other microservices to update wallet & stock portfolio
 * ----------------------------------------------------------------
 */
app.post("/placeStockOrder", authMiddleware, async (req, res) => {
  try {
    console.log("Order request received for user:", req.user.id);
    let { stock_id, is_buy, order_type, quantity, price } = req.body;

    // Validate required fields
    if (
      !stock_id ||
      typeof is_buy === "undefined" ||
      !order_type ||
      !quantity
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Only accept BUY/MARKET and SELL/LIMIT
    if (
      (is_buy && order_type !== "MARKET") ||
      (!is_buy && order_type !== "LIMIT")
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid order type: BUY must be MARKET, SELL must be LIMIT",
        });
    }

    let newOrder = new Order({
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
      wallet_tx_id: null,
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
          {
            $set: {
              order_status: "COMPLETED",
              stock_price: lowestPrice,
              wallet_tx_id: uuidv4(),
            },
          }
        );
      }
    }

    if (is_buy) {
      newOrder = await Order.findOne({ stock_tx_id: newOrder.stock_tx_id });
      if (newOrder.order_status === "COMPLETED") {
        console.log("Order completed:", newOrder);
        console.log("Updating wallet balance...");
        await axios.post(
          `http://api-gateway:8080/transaction/updateWallet`,
          {
            amount: newOrder.stock_price * newOrder.quantity,
            order_status: newOrder.order_status,
            is_buy: is_buy,
            stock_tx_id: newOrder.stock_tx_id,
            wallet_tx_id: newOrder.wallet_tx_id,
          },
          {
            headers: {
              token: req.headers.token, // Pass the authorization header
            },
          }
        );
      }
    }

    await axios.post(
      `${req.protocol}://api-gateway:8080/transaction/updateStockPortfolio`,
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

/**
 * ----------------------------------------------------------------
 * POST /orders/cancel
 * Cancel an order that is IN_PROGRESS
 * ----------------------------------------------------------------
 */
app.post('/cancelStockTransaction', authMiddleware, async (req, res) => {
  try {
    const { stock_tx_id } = req.body;
    if (!stock_tx_id) {
      return res.status(400).json({ success: false, message: 'stock_tx_id is required' });
    }

    const order = await Order.findOne({ stock_tx_id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.order_status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed or already canceled order',
      });
    }

    await Order.updateOne(
      { stock_tx_id },
      { $set: { order_status: 'CANCELLED' } }
    );

    res.json({ success: true, message: 'Order successfully canceled.' });
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

/**
 * ----------------------------------------------------------------
 * GET /orders/status/:order_id
 * Retrieve status of a single order
 * ----------------------------------------------------------------
 */
app.get('/orders/status/:order_id', authMiddleware, async (req, res) => {
  try {
    const { order_id } = req.params;
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

/**
 * ----------------------------------------------------------------
 * GET /orders/buy/:stock_id
 * For debugging / internal usage: fetch all BUY orders for a stock
 * ----------------------------------------------------------------
 */
app.get('/orders/buy/:stock_id', authMiddleware, async (req, res) => {
  try {
    const { stock_id } = req.params;
    const buyOrders = await Order.find({
      stock_id,
      is_buy: true,
      order_status: 'IN_PROGRESS'
    }).sort({ stock_price: -1 });

    res.json({ success: true, data: buyOrders });
  } catch (error) {
    console.error('Error fetching buy orders:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

/**
 * ----------------------------------------------------------------
 * GET /orders/sell/:stock_id
 * For debugging / internal usage: fetch all SELL orders for a stock
 * ----------------------------------------------------------------
 */
app.get('/orders/sell/:stock_id', authMiddleware, async (req, res) => {
  try {
    const { stock_id } = req.params;
    const sellOrders = await Order.find({
      stock_id,
      is_buy: false,
      order_status: 'IN_PROGRESS'
    }).sort({ stock_price: 1 });

    res.json({ success: true, data: sellOrders });
  } catch (error) {
    console.error('Error fetching sell orders:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

/**
 * ----------------------------------------------------------------
 * GET /orders/user/:user_id
 * Retrieve all orders (stock transactions) for a given user
 * ----------------------------------------------------------------
 */
app.get('/orders/user/:user_id', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.params;
    const transactions = await Order.find({ user_id }).sort({ created_at: 1 });

    if (!transactions.length) {
      return res
        .status(200)
        .json({ success: true, message: 'No transactions available.', data: [] });
    }

    res.json({ success: true, data: transactions });
  } catch (err) {
    console.error('Error fetching user orders:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// index.js
const PORT = process.env.ORDER_SERVICE_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Order Management Service running on port ${PORT}`);
});

