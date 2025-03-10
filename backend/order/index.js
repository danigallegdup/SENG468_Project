// backend/orderManagement/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require("uuid");

const authMiddleware = require('./authMiddleware'); // Import authMiddleware
const { publishOrder } = require("./matchingProducer"); // Import RabbitMQ producer
const redisClient = require("./redis"); // Import Redis
const { waitForOrderResponse } = require("./orderResponseConsumer");
const { publishToStockPortfolio } = require("./publishToStockPortfolio");

const transactionServiceUrl = "http://api-gateway:8080/transaction";
const userManagementServiceUrl = "http://api-gateway:8080/setup";

const app = express();
app.use(cors());
app.use(express.json());


// Health-check route
app.get('/health', (req, res) => res.status(200).send('OK'));

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

    let { stock_id, is_buy, order_type, quantity, price } = req.body;
    let token = req.headers.token;

    console.log("✅ Received POST /placeStockOrder request from user ", req.user.id);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);

    // Validate required fields
    if (!stock_id || typeof is_buy === 'undefined' || !order_type || !quantity) {
      console.log("Missing required fields (stock_id, is_buy, order_type, quantity)");
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (stock_id, is_buy, order_type, quantity)',
      });
    }

    if ((is_buy && order_type !== 'MARKET') || (!is_buy && order_type !== 'LIMIT')) {
      console.log("Invalid order type (MARKET/BUY or LIMIT/SELL)");
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    
    if (!is_buy && (typeof price !== 'number' || price <= 0)) {
      console.log("Sell limit orders must include a valid positive price.");
      return res.status(400).json({
        success: false,
        message: 'Sell limit orders must include a valid positive price.',
      });
    }

    // Make Order Object
    console.log("Making new order object");

    const stock_tx_id = uuidv4();
    const timestamp = Date.now();

    const newOrder = {
      user_id: req.user.id, // from authMiddleware
      stock_id,
      is_buy,
      order_type,
      quantity,
      stock_price: is_buy ? null : price, // BUY/MARKET has no price
      order_status: "IN_PROGRESS",
      created_at: new Date(),
      stock_tx_id,
      parent_stock_tx_id: null,
      wallet_tx_id: null,
      token
    };

    console.log("(order/index.js) Placing new order: ", newOrder);
    await redisClient.zadd(`stock_transactions:${req.user.id}`, timestamp, JSON.stringify(newOrder));
    
    // MARKET BUY order handling
    if (is_buy) {
      // Publish order to RabbitMQ
      publishOrder(newOrder);

      // Get response from Order Response RabbitMQ Queue
      const response = await waitForOrderResponse(newOrder.stock_tx_id, 1000000);
      
      console.log('(order/index.js) Received order response:', response);

      if (!response) {
        return res.status(500).json({ success: false, message: 'Order processing timeout' });
      }

      // Handle Order Response
      if (response.matched) {

        console.log("Order Service received match.");
        console.log("Updating stock_transactions as COMPLETED for user", req.user.id);

        await redisClient.zrem(`stock_transactions:${req.user.id}`, JSON.stringify(newOrder));
        await redisClient.zadd(`stock_transactions:${req.user.id}`, timestamp, JSON.stringify({
          ...newOrder,
          order_status: "COMPLETED",
          stock_price: response.stock_price,
          wallet_tx_id: response.wallet_tx_id,
        }));
      

        return res.status(200).json({success: true, data: null});
      }

    // LIMIT SELL Order handling
    } else {      
      console.log("In order service Processing SELL/LIMIT order:", newOrder);

      // Check user's portfolio
      let sellerStockQuantity = await redisClient.zscore(`stock_portfolio:${newOrder.user_id}`, newOrder.stock_id);      
      sellerStockQuantity = sellerStockQuantity ? parseInt(sellerStockQuantity) : 0;
      
      sellerStockQuantity = sellerStockQuantity ? parseInt(sellerStockQuantity) : 0;
      if (sellerStockQuantity < newOrder.quantity) {
        return res.status(400).json({ success: false, message: "Not enough stock to sell" });
      }

      // Update user's portfolio
      const updatedSellerQuantity = sellerStockQuantity - newOrder.quantity;
      if (updatedSellerQuantity <= 0) {
        await redisClient.zrem(`stock_portfolio:${newOrder.user_id}`, newOrder.stock_id);
        console.log(`❌ Removed ${newOrder.stock_id} from seller's portfolio (Quantity 0)`);
      } else {
        await redisClient.zadd(`stock_portfolio:${newOrder.user_id}`, updatedSellerQuantity, newOrder.stock_id);
        console.log(`✅ Updated seller's stock portfolio: ${newOrder.stock_id} -> ${updatedSellerQuantity}`);
      }

      // Record Transaction
      await redisClient.zadd(`stock_transactions:${req.user.id}`, timestamp, JSON.stringify(newOrder));

      // Add to Sell Order Sorted Set
      await redisClient.zadd(`sell_orders:${stock_id}`, price, JSON.stringify(newOrder));
      await redisClient.expire(`sell_orders:${stock_id}`, 3600);  // set expiry time for 1hr

      console.log("In order service Generated timestamp: ", timestamp);
      console.log("In order service stock_id: ", stock_id);

      // Get Market Price for Stock
      const currentLowestPrice = await redisClient.get(
        `market_price:${stock_id}`
      );

      // Update Market Price if newOrder is lower
      if (!currentLowestPrice || price < parseFloat(currentLowestPrice)) {
        await redisClient.set(
          `market_price:${stock_id}`,
          price,
          "EX",
          3600
        );   // set market price redis variable for stock

        await redisClient.zrem(
          `market_price_ordered`,
          stock_id
        );               // remove stale

        await redisClient.zadd(
          `market_price_ordered`,
          timestamp,
          stock_id
        );    // add to list of ordered market prices for getStockPrices

      }

      console.log("In order service Updating user's portfolio for sell order");
      console.log("user_id: ", newOrder.user_id);
      console.log("stock_id: ", newOrder.stock_id);
      console.log("quantity: ", newOrder.quantity);
      console.log("is_buy: ", is_buy);


    }

    console.log("In order service Order placed successfully:", newOrder);
    // Return order confirmation
    res.json({ success: true, data: newOrder });

  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});



const PORT = process.env.ORDER_SERVICE_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Order Service running on port ${PORT}`);
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

    console.log("In /cancelStockTransaction/")

    // Check if order exists in Redis
    const orderData = await redisClient.zrangebyscore(`stock_transactions:${req.user.id}`, "-inf", "+inf", "WITHSCORES");
    const order = orderData
      .map(order => JSON.parse(order))
      .find(o => o.stock_tx_id === stock_tx_id);

    if (!order) {
      console.log("No matching orders found for stock_tx_id: ", stock_tx_id);
      console.log("orderData: ", orderData);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log("order: ",order);

    // Ensure order is still cancellable
    if (order.order_status === 'COMPLETED' || order.order_status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed or already canceled order',
      });
    }

    // Remove order from Redis
    timestamp = order.created_at;
    console.log("Removing order from Redis with timestamp:",timestamp);
    await redisClient.zrem(`stock_transactions:${req.user.id}`, JSON.stringify(order));

    // Restore stock to user's portfolio
    const portfolioKey = `stock_portfolio:${order.user_id}`;
    let currentStockQuantity = await redisClient.zscore(portfolioKey, order.stock_id);
    currentStockQuantity = currentStockQuantity ? parseInt(currentStockQuantity) : 0;

    const restoredQuantity = currentStockQuantity + order.quantity;
    await redisClient.zadd(portfolioKey, restoredQuantity, order.stock_id);

    console.log(`Restored ${order.quantity} shares of ${order.stock_id} to user ${order.user_id}.`);

    const updatedOrder = { ...order, order_status: "CANCELLED" };
    await redisClient.zadd(`stock_transactions:${req.user.id}`, order.quantity, JSON.stringify(updatedOrder));

    res.json({ success: true, message: 'Order successfully canceled.' });

  } catch (error) {
    console.error('❌ Error canceling order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
