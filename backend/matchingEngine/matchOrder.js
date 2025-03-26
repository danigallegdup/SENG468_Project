/*
matchOrder.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/

const redisClient = require("./redis");
const axios = require("axios");
require("dotenv").config();
const amqp = require("amqplib");
const { v4: uuidv4 } = require("uuid"); 
// const { publishToWalletQueue } = require("./publishToWalletQueue");
// const { publishToStockPortfolio } = require("./publishToStockPortfolio");
const { acquireLock, releaseLock } = require("./redisLock");


let SERVICE_AUTH_TOKEN = "supersecretauthtoken";
const transactionServiceUrl = "http://api-gateway:8080/transaction";

/**
 * Matches incoming orders (Buy/Market) with Limit Sell orders.
 * Handles partial fulfillment.
 */
async function matchOrder(newOrder) {
  const lock = await acquireLock(`locks:stock:${newOrder.stock_id}`);
  
if (!lock) {
  console.warn(`Could not acquire lock for stock:${newOrder.stock_id}`);
  return { matched: false };
}

  // Begin tracking matchOrder runtime
  const start = Date.now();
  const { default: Redlock } = require('redlock');

  try {
    if (!newOrder.is_buy) {
      console.error(`❌ ERROR: Sell order reached matchOrder()!`, JSON.stringify(newOrder, null, 2));
      return { matched: false };
    }

    console.log(`✅ Order received by matchOrder:`, newOrder);
    SERVICE_AUTH_TOKEN = newOrder.token;

    // Get Market Price from Redis
    let marketPrice = await redisClient.get(`market_price:${newOrder.stock_id}`);
    console.log("marketPrice: ", marketPrice);

    if (!marketPrice) {
      console.log("⚠️ No market price available for ", newOrder.stock_id);
      return { matched: false };
    }

    marketPrice = parseFloat(marketPrice);
    let totalCost = marketPrice * newOrder.quantity;
    const new_wallet_tx_id = uuidv4();
    const timestamp = Date.now();

    // Find the lowest available SELL/LIMIT order
    const lowestSellOrder = await redisClient.zrange(
      `sell_orders:${newOrder.stock_id}`,
      0, 0,
      "WITHSCORES"
    );

    if (!lowestSellOrder || !lowestSellOrder.length) {
      console.log("No matching Sell orders found.");
      return { matched: false };
    }

    let sellOrder = JSON.parse(lowestSellOrder[0]);
    const parentTimestamp = new Date(sellOrder.created_at).getTime(); // original time the sell order was created

    // Check if BUY order can be fulfilled
    if (sellOrder.quantity < newOrder.quantity) {
      console.log("Cannot fully fulfill order. Available stocks at MARKET price:", sellOrder.quantity);
      return { matched: false };
    }

    let remainingQuantity = sellOrder.quantity - newOrder.quantity;
    console.log(`🔄 Matching ${sellOrder.quantity}/${newOrder.quantity} shares at ${sellOrder.stock_price}`);

    totalCost = parseInt(sellOrder.stock_price * newOrder.quantity);
    let balance = await redisClient.hget(`wallet:${newOrder.user_id}`, "balance") || "0";

    if (balance < totalCost) {
      return { matched: false, message: "Insufficient Balance" };
    }

    // Start Redis pipeline for batch processing
    const pipeline = redisClient.multi();

    // Deduct money from buyer's wallet
    pipeline.hincrbyfloat(`wallet:${newOrder.user_id}`, "balance", -totalCost);

    const fulfilled_stock_tx_id = uuidv4();

    if (remainingQuantity > 0) {
      // Partially fulfill the sell order
      sellOrder.quantity = remainingQuantity;

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
        wallet_tx_id: new_wallet_tx_id,
      };

      pipeline.zadd(`stock_transactions:${sellOrder.user_id}`, timestamp, JSON.stringify(childOrder));

      console.log("✅ Created child order:", childOrder);

      pipeline.zrem(
        `stock_transactions:${sellOrder.user_id}`,
        JSON.stringify(sellOrder));

      pipeline.zadd(
        `stock_transactions:${sellOrder.user_id}`,
        parentTimestamp,
        JSON.stringify({
          ...sellOrder,
          order_status: "PARTIALLY_FILLED",
          quantity: remainingQuantity,
          wallet_tx_id: null,
        })
      );
      
      pipeline.zrem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0]);
      pipeline.zadd(`sell_orders:${newOrder.stock_id}`, sellOrder.stock_price, JSON.stringify(sellOrder));

    } else {
      // Fully fulfilled, remove from Redis
      pipeline.zrem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0]);

      pipeline.zrem(
        `stock_transactions:${sellOrder.user_id}`,
        JSON.stringify(sellOrder));

      // Store completed stock transaction in Redis for seller
      pipeline.zadd(
        `stock_transactions:${sellOrder.user_id}`,
        timestamp,
        JSON.stringify({
          user_id: sellOrder.user_id,
          stock_id: sellOrder.stock_id,
          is_buy: false,
          order_type: "LIMIT",
          quantity: newOrder.quantity,
          stock_price: sellOrder.stock_price,
          order_status: "COMPLETED",
          created_at: sellOrder.created_at,
          stock_tx_id: fulfilled_stock_tx_id,
        })
      );

      console.log(`✅ Fully fulfilled order ${sellOrder.stock_tx_id}, stored in Redis.`);
    }

    // Credit seller's wallet
    pipeline.hincrbyfloat(`wallet:${sellOrder.user_id}`, "balance", sellOrder.stock_price * newOrder.quantity);

    // Store wallet transaction for seller
    const wallet_tx_id = uuidv4();
    pipeline.zadd(
      `wallet_transactions:${sellOrder.user_id}`,
      timestamp,
      JSON.stringify({
        wallet_tx_id,
        user_id: sellOrder.user_id,
        stock_tx_id: fulfilled_stock_tx_id,
        amount: newOrder.quantity * sellOrder.stock_price,
        is_debit: false,
        time_stamp: new Date(),
      })
    );

    // Update buyer's stock portfolio
    let current_holding = await redisClient.zscore(`stock_portfolio:${newOrder.user_id}`, newOrder.stock_id);
    current_holding = current_holding ? parseInt(current_holding) : 0;

    const updatedBuyerQuantity = current_holding + newOrder.quantity;
    pipeline.zadd(`stock_portfolio:${newOrder.user_id}`, updatedBuyerQuantity, newOrder.stock_id);

    // Store wallet transaction for buyer
    pipeline.zadd(
      `wallet_transactions:${newOrder.user_id}`,
      timestamp,
      JSON.stringify({
        wallet_tx_id: new_wallet_tx_id,
        stock_tx_id: newOrder.stock_tx_id,
        is_debit: true,
        amount: totalCost,
        time_stamp: new Date(),
      })
    );

    // Store stock transaction for buyer
    pipeline.zrem(
      `stock_transactions:${newOrder.user_id}`,
      JSON.stringify(newOrder));

    await redisClient.zadd(
      `stock_transactions:${newOrder.user_id}`,
      timestamp,
      JSON.stringify({
        ...newOrder,
        order_status: "COMPLETED",
        stock_price: sellOrder.stock_price,
        wallet_tx_id: new_wallet_tx_id,
      })
    );

    // console.log(`User ${response.user_id} stock_transactions updated`);

    console.log("✅ Executing Redis pipeline...");
    const redis_result = await pipeline.exec();
    console.log("Redis pipeline result:", redis_result);

    console.log("(matchOrder.js) Storing wallet transaction for buyer.");
    return {
      matched: true,
      stock_tx_id: fulfilled_stock_tx_id,
      stock_price: sellOrder.stock_price,
      wallet_tx_id: new_wallet_tx_id,
      user_id: newOrder.user_id,
    };

  } catch (error) {
    console.log("!! SERVICE_AUTH_TOKEN:", SERVICE_AUTH_TOKEN);
    console.error("❌ Error matching order:", error);
    return { matched: false };
  } finally {
    const runtime = Date.now() - start;
    console.log(`matchOrder execution time: ${runtime}ms`);
    await releaseLock(lock);
  }
}

module.exports = { matchOrder };