// backend/orderManagement/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const connectDB = require('./db');
const Order = require('./Order');

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
app.post('/placeStockOrder', authMiddleware, async (req, res) => {
  try {
    const { stock_id, is_buy, order_type, quantity, price } = req.body;

    if (!stock_id || typeof is_buy === 'undefined' || !order_type || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (stock_id, is_buy, order_type, quantity)',
      });
    }

    if ((is_buy && order_type !== 'MARKET') || (!is_buy && order_type !== 'LIMIT')) {
      return res
        .status(400)
        .json({ success: false, message: 'BUY must be MARKET, SELL must be LIMIT' });
    }

    // Create new order object
    const newOrder = new Order({
      user_id: req.user.id, // from authMiddleware
      stock_id,
      is_buy,
      order_type,
      quantity,
      stock_price: is_buy ? null : price, 
      order_status: 'IN_PROGRESS',
      created_at: new Date(),
      stock_tx_id: `tx_${Date.now()}`,
      parent_stock_tx_id: null,
      wallet_tx_id: null,
    });

    await newOrder.save();
    console.log('Order placed:', newOrder);

    let responseOrder = { ...newOrder._doc };

    if (is_buy) {
      const lowestSellOrder = await Order.findOne({
        stock_id,
        is_buy: false,
        order_status: 'IN_PROGRESS',
      }).sort({ stock_price: 1 });

      if (!lowestSellOrder) {
        await Order.updateOne(
          { _id: newOrder._id },
          { $set: { order_status: 'CANCELLED' } }
        );
        responseOrder.order_status = 'CANCELLED';
        return res.json({ success: true, data: responseOrder });
      }

      await Order.updateOne(
        { _id: newOrder._id },
        {
          $set: {
            order_status: 'COMPLETED',
            stock_price: lowestSellOrder.stock_price, // matched price
            wallet_tx_id: `wallet_${Date.now()}`,
          },
        }
      );
      await Order.updateOne(
        { _id: lowestSellOrder._id },
        { $set: { order_status: 'COMPLETED' } }
      );

      // 3) "Once matching is confirmed, update stockPortfolio and walletBalance"
      const completedOrder = await Order.findById(newOrder._id);

      try {
        // (a) Update wallet
        // Point this to your actual Wallet service endpoint
        await axios.post(
          `http://localhost:5002/transaction/updateWallet`,
          {
            amount: completedOrder.stock_price * completedOrder.quantity,
            order_status: completedOrder.order_status,
            is_buy: completedOrder.is_buy,
            stock_tx_id: completedOrder.stock_tx_id,
            wallet_tx_id: completedOrder.wallet_tx_id,
          },
          {
            headers: {
              token: req.headers.token // forward the token if needed
            },
          }
        );

        // (b) Update stock portfolio
        // Point this to your actual Stock/Portfolio service endpoint
        await axios.post(
          `http://localhost:5003/transaction/UpdateStockPortfolio`,
          {
            user_id: completedOrder.user_id,
            stock_id: completedOrder.stock_id,
            quantity: completedOrder.quantity,
            is_buy: completedOrder.is_buy,
          },
          {
            headers: {
              token: req.headers.token,
            }
          }
        );
      } catch (err) {
        console.error('Error updating wallet/portfolio:', err.message);
      }

      // Update our response to reflect the final order state
      responseOrder = { ...completedOrder._doc };
    }

    // Return final updated order
    res.json({ success: true, data: responseOrder });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
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

