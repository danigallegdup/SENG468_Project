/*
matchOrder.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/
const redisClient = require("./redis");
const axios = require('axios');
require('dotenv').config();
const amqp = require('amqplib');
let SERVICE_AUTH_TOKEN = "supersecretauthtoken";
const userManagementServiceUrl = "http://api-gateway:8080/setup";
const transactionServiceUrl = "http://api-gateway:8080/transaction";
const { v4: uuidv4 } = require("uuid"); 
const { publishToWalletQueue } = require("./publishToWalletQueue");
const { publishToStockPortfolio } = require("./publishToStockPortfolio");


/**
 * Matches incoming orders (Buy/Market) with Limit Sell orders.
 * Handles partial fulfillment.
 */

async function matchOrder(newOrder) {
  try {
    if (!newOrder.is_buy) {
      console.error(`❌ ERROR: Sell order reached matchOrder()!`, JSON.stringify(newOrder, null, 2));
      return { matched: false };
    }

    console.log(`✅ Order received by matchOrder:`, newOrder);
    SERVICE_AUTH_TOKEN = newOrder.token;

    // Get Market Price from Reddit variable
    let marketPrice = await redisClient.get(`market_price:${newOrder.stock_id}`);

    if (!marketPrice) {
      console.log("⚠️ No market price available for ", newOrder.stock_id);
      return { matched: false };
    }

    marketPrice = parseFloat(marketPrice);
    let totalCost = marketPrice*newOrder.quantity;
    const new_wallet_tx_id = uuidv4();
    const timestamp = Date.now();

    // Find the lowest available SELL/LIMIT order
    const lowestSellOrder = await redisClient.zrange(
      `sell_orders:${newOrder.stock_id}`,
      0, 0,
      "WITHSCORES"
    );

    console.log("Lowest sell order: ", lowestSellOrder);

    // Check for a match
    if (!lowestSellOrder || !lowestSellOrder.length) {
      console.log("No matching Sell orders found.");
      return { matched: false };
    }

    // Match is found
    let sellOrder = JSON.parse(lowestSellOrder[0]);

    // Check BUY order can be fulfilled by market price order
    if (sellOrder.quantity < newOrder.quantity) {
      console.log(
        "Cannot fulfill order. Available stocks at MARKET price: ",
        sellOrder.quantity
      );
      return { matched: false };
    }

    let remainingQuantity = sellOrder.quantity-newOrder.quantity;
    console.log(`🔄 Matching ${sellOrder.quantity}/${newOrder.quantity} shares at ${sellOrder.stock_price}`);

    // Subtract money from buyer's wallet
    totalCost = parseInt(sellOrder.stock_price*newOrder.quantity);
    balance = await redisClient.hget(`wallet:${newOrder.user_id}`, "balance") || "0";
    if (balance < totalCost) {
      return { matched: false, message: "Insufficient Balance"};
    } else {
      await redisClient.hincrbyfloat(`wallet:${newOrder.user_id}`, "balance", -totalCost);
    }

    // Handle Sell Order
    const fulfilled_stock_tx_id = uuidv4();
    if (remainingQuantity > 0) {
      // Partially fulfill the sell order
      sellOrder.quantity = remainingQuantity;

      // Create and store child transaction in Redis
      const childOrder = {
        user_id: sellOrder.user_id,
        stock_id: sellOrder.stock_id,
        is_buy: false,
        order_type: "LIMIT",
        quantity: newOrder.quantity,
        stock_price: sellOrder.stock_price,
        order_status: "COMPLETED",
        created_at: new Date(),
        stock_tx_id: fulfilled_stock_tx_id,
        parent_stock_tx_id: sellOrder.stock_tx_id,
        wallet_tx_id: new_wallet_tx_id
      };

      await redisClient.zadd(`stock_transactions:${sellOrder.user_id}`, timestamp, JSON.stringify(childOrder));

      console.log("✅ Created child order: ", childOrder);

      // Update parent order in Redis
      await redisClient.zrem(`stock_transactions:${sellOrder.user_id}`, JSON.stringify(sellOrder));    // Remove order from redis
      await redisClient.zadd(`stock_transactions:${sellOrder.user_id}`, timestamp, JSON.stringify({
        ...sellOrder,
        order_status: "PARTIALLY_FILLED",
        quantity: remainingQuantity,
        wallet_tx_id: null
      }));


      console.log(`🔄 Updated parent order ${sellOrder.stock_tx_id} in Redis`);

      // Remove old order and reinsert updated order
      await redisClient.zrem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0]);
      await redisClient.zadd(`sell_orders:${newOrder.stock_id}`, sellOrder.stock_price, JSON.stringify(sellOrder));

      console.log("✅ Updated partially filled order in Redis:", sellOrder);
    } else {
      // Fully fulfilled, remove from Redis
      await redisClient.zrem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0]);

      // Store  stock transaction in Redis for seller
      await redisClient.zadd(`stock_transactions:${fulfilled_stock_tx_id}`, timestamp, JSON.stringify({
        user_id: sellOrder.user_id,
        stock_id: sellOrder.stock_id,
        is_buy: false,
        order_type: "LIMIT",
        quantity: newOrder.quantity,
        stock_price: sellOrder.stock_price,
        order_status: "COMPLETED",
        created_at: sellOrder.created_at,
        stock_tx_id: fulfilled_stock_tx_id,
      }));

      console.log(`✅ Fully fulfilled order ${sellOrder.stock_tx_id}, stored in Redis.`);
    }
  
   // Credit seller's wallet in Redis directly
   await redisClient.hincrbyfloat(`wallet:${sellOrder.user_id}`, "balance", sellOrder.stock_price*newOrder.quantity);

   // Store Wallet Transaction for Seller
   const wallet_tx_id = uuidv4(); // Unique transaction ID
   const seller_wallet_transaction = {
       wallet_tx_id,
       user_id: sellOrder.user_id,
       stock_tx_id: fulfilled_stock_tx_id,
       amount: newOrder.amount,
       is_debit: false,
       time_stamp: new Date()
   };

   await redisClient.zadd(`wallet_transactions:${sellOrder.user_id}`, timestamp, JSON.stringify(seller_wallet_transaction));

   // Update buyer's stock portfolio in Redis directly
   let current_holding = await redisClient.zscore(`stock_portfolio:${newOrder.user_id}`, newOrder.stock_id);
   current_holding = current_holding ? parseInt(current_holding) : 0;

   const updatedBuyerQuantity = current_holding + newOrder.quantity;
   await redisClient.zadd(`stock_portfolio:${newOrder.user_id}`, updatedBuyerQuantity, newOrder.stock_id);

    // Store wallet transaction in Redis for buyer
    const buyer_wallet_transaction = {
      wallet_tx_id: new_wallet_tx_id,
      stock_tx_id: newOrder.stock_tx_id,
      is_debit: true,
      amount: totalCost,
      time_stamp: new Date()
    }

    await redisClient.zadd(
      `wallet_transactions:${newOrder.user_id}`,
      timestamp,
      JSON.stringify(buyer_wallet_transaction)
    );
    
    console.log("(matchOrder.js) Storing wallet transaction for buyer: ", buyer_wallet_transaction);

    return { matched: true, stock_tx_id: fulfilled_stock_tx_id, stock_price: sellOrder.stock_price, wallet_tx_id: new_wallet_tx_id, user_id: newOrder.user_id };

  } catch (error) {
    console.log("!! SERVICE_AUTH_TOKEN:", SERVICE_AUTH_TOKEN);
    console.error("❌ Error matching order:", error);
    return { matched: false };
  }
}

module.exports = { matchOrder };

