/*
matchOrder.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/

const Order = require("./Order");
const { cacheStockPrice } = require("./redis");
const SERVICE_AUTH_TOKEN = process.env.SERVICE_AUTH_TOKEN;

/**
 * Matches incoming orders (Buy/Market) with Limit Sell orders.
 * Handles partial fulfillment.
 */

async function matchOrder(newOrder) {
  try {
    if (!newOrder.is_buy) return { matched: false }; // Only match BUY/MARKET orders

    // Find the lowest available SELL/LIMIT order
    const lowestSellOrder = await redisClient.zRangeWithScores(
      `sell_orders:${newOrder.stock_id}`,
      0, 0, {rev: false}
    );


    // Check for a match
    if (!lowestSellOrder.length) {
      console.log("No matching Sell orders found.");
      return { matched: false };
    } 

    // Match is found
    let sellOrder = JSON.parse(lowestSellOrder[0].value);

    
    // Check BUY order can be fulfilled by market price order
    if (sellOrder.quantity < newOrder.quantity) {
      console.log("Cannot fulfill order. Available stocks at MARKET price: ", lowestSellOrder.quantity);
      return { matched: false };
    }

    let executedQuantity = sellOrder.quantity-newOrder.quantity;
    console.log(`🔄 Matching ${executedQuantity}/${newOrder.quantity} shares at ${sellOrder.stock_price}`);

    // If the sell order has more shares than the buy order, partially fulfill it
    if (sellOrder.quantity > newOrder.quantity) {
      let remainingQuantity = sellOrder.quantity-newOrder.quantity;

      // Create child order with parent_tx_id
      const childOrder = new Order({
        user_id: sellOrder.user_id,
        stock_id: sellOrder.stock_id,
        is_buy: false,
        order_type: "LIMIT",
        quantity: newOrder.quantity,
        stock_price: sellOrder.stock_price, 
        order_status: 'COMPLETED',
        created_at: new Date(),
        stock_tx_id: `tx_${Date.now()}`,
        parent_stock_tx_id: sellOrder.stock_tx_id,
        wallet_tx_id: null,
      });

      // Add child to database
      await childOrder.save();

      // Update parent order in database
      await Order.updateOne(
        { stock_tx_id: sellOrder.stock_tx_id },
        { 
          $set: { 
            order_status: "PARTIALLY_FILLED", 
            stock_price: sellOrder.stock_price, 
            quantity: remainingQuantity
          }
        }
      );

      // Remove parent order from redis set
      await redisClient.zRem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0].value);

      // Re-add partially-filled parent order to redis set
      sellOrder.quantity = remainingQuantity,
      await redisClient.zAdd(`sell_orders:${newOrder.stock_id}`, {
        score: sellOrder.stock_price,
        value: JSON.stringify(sellOrder)
      });

    } else {
    // If the sell order is fully fulfilled, process it as 'COMPLETED'
      await redisClient.zRem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0].value); // Remove from redis set

      // Update order object
      await Order.updateOne(
        { stock_tx_id: newOrder.stock_tx_id },
        { 
          $set: { 
            order_status: "COMPLETED", 
            stock_price: sellOrder.stock_price, 
            quantity: executedQuantity
          } 
        }
      );

    }
  
    // Add to buyer's stock portfolio
    await updateStockPortfolio(newOrder.user_id, newOrder.stock_id, newOrder.quantity, newOrder.is_buy);

    // Update seller's wallet
    await updateWallet(sellOrder.user_id, sellOrder.stock_price*newOrder.quantity, false);

    return { matched: true };

  } catch (error) {
    console.error("❌ Error matching order:", error);
    return { matched: false };
  }
}

/**
 * Updates wallet balance using API
 */
async function updateWallet(user_id, amount, isCharge) {
  try {
      const walletResponse = await axios.post(
        `${req.protocol}://${req.get(
          "host"
        )}/transaction/subMoneyFromWallet`,
        {
          user_id: newOrder.user_id,
          stock_id: newOrder.stock_id,
          quantity: -newOrder.quantity, // Adjust quantity based on buy/sell
          is_buy: is_buy,
        },
        {
          headers: {
            token: SERVICE_AUTH_TOKEN // Pass the authorization header
          },
        }
      );

    if (response.data.success) {
      console.log(`💰 Wallet updated for user ${user_id}: ${isCharge ? "-" : "+"}$${amount}`);
    } else {
      console.error(`⚠️ Failed to update wallet for user ${user_id}`);
    }
  } catch (error) {
    console.error(`❌ Error updating wallet for user ${user_id}:`, error);
  }
}

/**
 * Updates stock portfolio using API
 */
async function updateStockPortfolio(user_id, stock_id, quantity, is_buy) {
  try {
      const portfolioResponse = await axios.post(
        `${req.protocol}://${req.get(
          "host"
        )}/transaction/addStockToUser`,
        {
          user_id: user_id,
          stock_id: stock_id,
          quantity, // Adjust quantity based on buy/sell
          is_buy: is_buy,
        },
        {
          headers: {
            token: SERVICE_AUTH_TOKEN, // Pass the authorization header
          },
        }
      );

    if (response.data.success) {
      console.log(`📈 Portfolio updated for user ${user_id}: ${isBuy ? "+" : "-"}${quantity} shares of ${stock_id}`);
    } else {
      console.error(`⚠️ Failed to update portfolio for user ${user_id}`);
    }
  } catch (error) {
    console.error(`❌ Error updating stock portfolio for user ${user_id}:`, error);
  }
}


module.exports = { matchOrder };

