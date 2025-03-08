// backend/orderManagement/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const connectDB = require('./db');
const Order = require('./Order');
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

connectDB();

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

    console.log("✅ Received POST /placeStockOrder request from user ",req.user.id);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);

    // Check if required fields are defined
    if (!stock_id || typeof is_buy === 'undefined' || !order_type || !quantity) {
      console.log("Missing required fields (stock_id, is_buy, order_type, quantity)");
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (stock_id, is_buy, order_type, quantity)',
      });
    }

    // Ensure MARKET/BUY or LIMIT/SELL
    if ((is_buy && order_type !== 'MARKET') || (!is_buy && order_type !== 'LIMIT')) {
      console.log("Invalid order type (MARKET/BUY or LIMIT/SELL)");
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Validate Buy order input
    // if (is_buy && price !== undefined) {
    //   console.log("Market buy orders must not include a price.");
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Market buy orders must not include a price.',
    //   });
    // }
    
    // Validate Sell order input
    if (!is_buy && (typeof price !== 'number' || price <= 0)) {
      console.log("Sell limit orders must include a valid positive price.");
      return res.status(400).json({
        success: false,
        message: 'Sell limit orders must include a valid positive price.',
      });
    }

    console.log("Making order object");

    // Make Order Object
    const newOrder = new Order({
      user_id: req.user.id, // from authMiddleware
      stock_id,
      is_buy,
      order_type,
      quantity,
      stock_price: is_buy ? null : price, // BUY/MARKET has no price
      order_status: "IN_PROGRESS",
      created_at: new Date(),
      stock_tx_id: uuidv4(),
      parent_stock_tx_id: null,
      wallet_tx_id: null,
      token
    });

    console.log("In place stock order newOrder: ", newOrder);
    
    // Process order
    // If it's Buy/Market, deduct from the user's wallet and send to RabbitMQ for fulfillment by the matching engine
    // If it's Sell/Limit, add it to its respective redis set
    if (is_buy) {

      await newOrder.save();

      // Publish order to RabbitMQ
      console.log('In order service Sending MARKET/BUY order to RabbitMQ:', newOrder);
      publishOrder(newOrder);
      console.log('In order service Sent MARKET/BUY order to RabbitMQ:', newOrder);

      // Get response from Order Response RabbitMQ Queue
      console.log('In order service Waiting for order response:', newOrder.stock_tx_id);
      const response = await waitForOrderResponse(newOrder.stock_tx_id, 1000000);
      console.log('In order service Received order response:', response);

      if (!response) {
        return res.status(500).json({ success: false, message: 'Order processing timeout' });
      }

      // Handle Order Response
      if (response.matched) {

        console.log("In order service response matched: ", response);
        console.log(
          "In order service response.stock_price: ",
          response.stock_price
        );
        console.log(
          "In order service response.wallet_tx_id: ",
          response.wallet_tx_id
        );

        await Order.updateOne(
          { stock_tx_id: newOrder.stock_tx_id },
          { 
            $set: { 
              order_status: "COMPLETED",
              stock_price: response.stock_price,
              wallet_tx_id: response.wallet_tx_id
            }
          }
        );
        console.log("In order service Order updated in DB");

        return res.status(200).json({success: true, data: null});
      } else {
        // refund user and return appropriate response
        console.log(
          "In order service Order not matched. Refunding user: ",
          newOrder.user_id
        );
        await axios.post(
          `${transactionServiceUrl}/addMoneyToWallet`,
          {
            amount: newOrder.stock_price * newOrder.quantity
          },
          { headers: { token: req.headers.token } }
        );

        console.log(
          "In order service Refunded user $",
          newOrder.stock_price * newOrder.quantity
        );

        return res.status(200).json({success: false, data: 'error: '});
      }

    } else {
      // Attempt to deduct stocks from user's portfolio
      
      console.log("In order service Processing SELL/LIMIT order:", newOrder);
      
      // Add order to database
      await newOrder.save();

      // Add order to Redis sorted set
      redisSellOrdersKey = `sell_orders:${stock_id}`;
      await redisClient.zadd(redisSellOrdersKey, price, JSON.stringify(newOrder));
      console.log(
        `In order service Added SellOrder to Redis Sorted Set: ${redisSellOrdersKey}`
      );
      
      // Clear cached data after an hour to avoid stale entries
      await redisClient.expire(redisSellOrdersKey, 3600);

      const timestamp = Date.now();
      console.log("In order service Generated timestamp: ", timestamp);
      console.log("In order service stock_id: ", stock_id);

      // Update lowest price for stock
      const currentLowestPrice = await redisClient.get(
        `market_price:${stock_id}`
      );
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
        console.log(
          `In order service Updated market price for stock ${stock_id}: ${price}`
        );
      }

      console.log("In order service Updating user's portfolio for sell order");
      console.log("user_id: ", newOrder.user_id);
      console.log("stock_id: ", newOrder.stock_id);
      console.log("quantity: ", newOrder.quantity);
      console.log("is_buy: ", is_buy);

      // Publish to Stock Portfolio
      const needToUpdate ={
          user_id: newOrder.user_id,
          stock_id: newOrder.stock_id,
          quantity: newOrder.quantity,
          is_buy: is_buy
        }
      publishToStockPortfolio(needToUpdate);

    //   await axios.post(
    //     `${transactionServiceUrl}/updateStockPortfolio`,
    //     {
    //       user_id: newOrder.user_id,
    //       stock_id: newOrder.stock_id,
    //       quantity: newOrder.quantity,
    //       is_buy: is_buy
    //     },
    //     {
    //       headers: {
    //         token: req.headers.token, // Pass the authorization header
    //       },
    //     }
    //   );

    }

    console.log("In order service Order placed successfully:", newOrder);
    // Return order confirmation
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

    // Check db for order
    const order = await Order.findOne({ stock_tx_id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log("order.order_status: ",order.order_status);

    // Check order is in progress
    if (order.order_status == 'COMPLETED' || order.order_status == 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed or already canceled order',
      });
    }

    // Find/remove order from redis
    if (!order.is_buy) {
      const redisKey = `sell_orders:${order.stock_id}`;
      
      // Retrieve full sorted set entry
      const sellOrders = await redisClient.zrange(redisKey, 0, -1);
      const matchingOrder = sellOrders.find(o => JSON.parse(o).stock_tx_id === stock_tx_id);

      if (matchingOrder) {
        await redisClient.zrem(redisKey, matchingOrder);
        console.log(`Removed SELL order ${stock_tx_id} from Redis.`);
      }
    }

    // Return stock to user
    await axios.post(
      `${userManagementServiceUrl}/addStockToUser`,
      {
        stock_id: order.stock_id,
        quantity: order.quantity
      },
      {
        headers: {
          token: req.headers.token // Pass the authorization header
        },
      }
    );

    // Update order in DB as cancelled
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

const PORT = process.env.ORDER_SERVICE_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Order Service running on port ${PORT}`);
});
