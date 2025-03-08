/*
matchOrder.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/

const Order = require("./Order");
const redisClient = require("./redis");
const axios = require('axios');
require('dotenv').config();
let SERVICE_AUTH_TOKEN = "supersecretauthtoken";
const userManagementServiceUrl = "http://api-gateway:8080/setup";
const transactionServiceUrl = "http://api-gateway:8080/transaction";
const { v4: uuidv4 } = require("uuid"); 


/**
 * Matches incoming orders (Buy/Market) with Limit Sell orders.
 * Handles partial fulfillment.
 */

async function matchOrder(newOrder) {
  try {
    if (!newOrder.is_buy) {
      console.error(`❌ ERROR: Sell order reached matchOrder()!`, JSON.stringify(newOrder, null, 2));
      return { matched: false, expense: 0 };
    }

    console.log(`✅ Order received by matchOrder:`, newOrder);
    SERVICE_AUTH_TOKEN = newOrder.token;
    // Get Market Price from Reddit variable
    let marketPrice = await redisClient.get(`market_price:${newOrder.stock_id}`);

    if (!marketPrice) {
      console.log("⚠️ No market price available for ", newOrder.stock_id);
      return { matched: false, expense: 0 };
    }

    marketPrice = parseFloat(marketPrice);
    totalCost = marketPrice*newOrder.quantity;

    console.log(`🔍 Debug: totalCost before sending =`, totalCost, typeof totalCost);
    console.log("newOrder.user_id: ",newOrder.user_id);

    const new_wallet_tx_id = uuidv4();

    // Subtract money from user's wallet
    const walletResponse = await updateWallet(
      newOrder.user_id, 
      totalCost, 
      true,
      newOrder.stock_tx_id,
      new_wallet_tx_id
    );

    console.log("walletResponse: ", walletResponse);

    // Return failure if insufficient funds
    if (!walletResponse || !walletResponse.success) {
      return { matched: false, expense: totalCost, message: 'Insufficient funds to place order.' };
    }
    
    // Find the lowest available SELL/LIMIT order
    const lowestSellOrder = await redisClient.zRangeWithScores(
      `sell_orders:${newOrder.stock_id}`,
      0, 0, {rev: false}
    );

    console.log("Lowest sell order: ", lowestSellOrder);

    // Check for a match
    if (!lowestSellOrder || !lowestSellOrder.length) {
      console.log("No matching Sell orders found.");
      return { matched: false, expense: totalCost };
    }

    // Match is found
    let sellOrder = JSON.parse(lowestSellOrder[0].value);

    // Check BUY order can be fulfilled by market price order
    if (sellOrder.quantity < newOrder.quantity) {
      console.log("Cannot fulfill order. Available stocks at MARKET price: ", sellOrder.quantity);
      return { matched: false, expense: totalCost };
    }

    let executedQuantity = sellOrder.quantity-newOrder.quantity;
    console.log(`🔄 Matching ${executedQuantity}/${newOrder.quantity} shares at ${sellOrder.stock_price}`);

    // Handle sell order
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
        stock_tx_id: uuidv4(),
        parent_stock_tx_id: sellOrder.stock_tx_id,
        wallet_tx_id: newOrder.wallet_tx_id,
        token: newOrder.token
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
    await updateWallet(sellOrder.user_id, sellOrder.stock_price*newOrder.quantity, false, sellOrder.stock_tx_id, sellOrder.wallet_tx_id);

    console.log("sellOrder.stock_price: ", sellOrder.stock_price);
    console.log("new_wallet_tx_id: ", new_wallet_tx_id);
    return { matched: true, expense: sellOrder.stock_price*newOrder.quantity, stock_price: sellOrder.stock_price, wallet_tx_id: new_wallet_tx_id };

  } catch (error) {
    console.log("!! SERVICE_AUTH_TOKEN:", SERVICE_AUTH_TOKEN);
    console.error("❌ Error matching order:", error);
    return { matched: false, expense: 0 };
  }
}

/**
 * Updates wallet balance using API
 */
async function updateWallet(user_id, amount, is_buy, stock_tx_id, wallet_tx_id) {
  try {
    console.log("🔍 Sending Wallet Update Request:", {
      userId: user_id,
      amount: amount,
      is_buy: is_buy,
      stock_tx_id: stock_tx_id,
      wallet_tx_id: wallet_tx_id
    });

    if (typeof amount !== "number" || isNaN(amount)) {
      throw new Error(`❌ ERROR: Invalid amount provided for wallet update: ${amount}`);
    }  

    const walletResponse = await axios.post(
      `${transactionServiceUrl}/updateWallet`,
      { 
        user_id, 
        amount, 
        is_buy, 
        stock_tx_id, 
        wallet_tx_id 
      },
      {
        headers: { 
          "token": SERVICE_AUTH_TOKEN
        }
      }
    );

    console.log("✅ Wallet API Response:", walletResponse.data);

    if (walletResponse.data.success) {
      console.log(`💰 Wallet updated for user ${user_id}: ${is_buy ? "-" : "+"}$${amount}`);
      return { success: true };
    } else {
      console.error(`⚠️ Failed to update wallet for user ${user_id}:`, walletResponse.data);
      return { success: false, message: walletResponse.data.message };
    }

  } catch (error) {
    console.error(`❌ Error updating wallet for user ${user_id}:`, 
      error.response?.data || error.message
    );
    return { success: false, message: error.response?.data?.error || "Unknown error" };
  }
}


/**
 * Updates stock portfolio using API
 */
async function updateStockPortfolio(user_id, stock_id, quantity, is_buy) {
  try {
    console.log("🔍 Sending Stock Portfolio Update Request:", {
      user_id: user_id,
      stock_id: stock_id,
      quantity: quantity,
      is_buy: is_buy
    });

    const portfolioResponse = await axios.post(
      `${transactionServiceUrl}/updateStockPortfolio`,
      {
        user_id: user_id,
        stock_id: stock_id,
        quantity: quantity,
        is_buy: is_buy
      },
      {
        headers: {
          "token": SERVICE_AUTH_TOKEN
        },
      }
    );

    if (portfolioResponse.data.success) {
      console.log(`📈 Portfolio updated for user ${user_id}: +${quantity} shares of ${stock_id}`);
      return { success: true };
    } else {
      console.error(`⚠️ Failed to update portfolio for user ${user_id}`);
      return { success: false, message: portfolioResponse.data.message };
    }
  } catch (error) {
    console.error(`❌ Error updating stock portfolio for user ${user_id}:`, error);
    return { success: false, message: error.response?.data?.error || "Unknown error" };
  }
}



module.exports = { matchOrder };

