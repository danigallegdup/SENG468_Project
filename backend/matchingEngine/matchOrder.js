/*
matchOrder.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/

const Order = require("./Order");
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
    console.log("In match order newOrder.user_id: ",newOrder.user_id);

    const new_wallet_tx_id = uuidv4();

    // Subtract money from user's wallet
    const walletResponse = await updateWallet(
      newOrder.user_id, 
      totalCost, 
      true,
      newOrder.stock_tx_id,
      new_wallet_tx_id
    );

    console.log("In match order walletResponse: ", walletResponse);

    // Return failure if insufficient funds
    if (!walletResponse) {
      console.log("❌ Insufficient funds to place order.");
      return { matched: false, expense: totalCost, message: 'Insufficient funds to place order.' };
    }
    
    // Find the lowest available SELL/LIMIT order
    const lowestSellOrder = await redisClient.zrange(
      `sell_orders:${newOrder.stock_id}`,
      0, 0,
      "WITHSCORES"
    );

    console.log("In match order Lowest sell order: ", lowestSellOrder);

    // Check for a match
    if (!lowestSellOrder || !lowestSellOrder.length) {
      console.log("No matching Sell orders found.");
      return { matched: false, expense: totalCost };
    }

    // Match is found
    let sellOrder = JSON.parse(lowestSellOrder[0]);

    // Check BUY order can be fulfilled by market price order
    if (sellOrder.quantity < newOrder.quantity) {
      console.log(
        "In match order Cannot fulfill order. Available stocks at MARKET price: ",
        sellOrder.quantity
      );
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

      console.log("In match order childOrder: ", childOrder);

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

      console.log("In match order sellOrder: ", sellOrder);

      // Remove parent order from redis set
      await redisClient.zrem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0]);

      // Re-add partially-filled parent order to redis set
      sellOrder.quantity = remainingQuantity,
      await redisClient.zadd(
        `sell_orders:${newOrder.stock_id}`,
        sellOrder.stock_price,
        JSON.stringify(sellOrder)
      );
      
      console.log("In match order after adding to cache: ", sellOrder);

    } else {
    // If the sell order is fully fulfilled, process it as 'COMPLETED'
      await redisClient.zrem(`sell_orders:${newOrder.stock_id}`, lowestSellOrder[0]); // Remove from redis set

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

    console.log(
      "In match order sellOrder.stock_price: ",
      sellOrder.stock_price
    );
    console.log("In match order new_wallet_tx_id: ", new_wallet_tx_id);
    return { matched: true, expense: sellOrder.stock_price*newOrder.quantity, stock_price: sellOrder.stock_price, wallet_tx_id: new_wallet_tx_id };

  } catch (error) {
    console.log("!! SERVICE_AUTH_TOKEN:", SERVICE_AUTH_TOKEN);
    console.error("❌ Error matching order:", error);
    return { matched: false, expense: 0 };
  }
}

// async function publishToWalletQueue(addToWallet) {
//   try {
//           const connection = await amqp.connect({
//               protocol: 'amqp',
//               hostname: 'rabbitmq',
//               port: 5672,
//               username: 'admin',
//               password: 'admin',
//               vhost: '/'
//           });
  
//           const channel = await connection.createChannel();
  
//           await channel.assertQueue("MoneyToWallet", { durable: true });
  
//           // Send the order to the queue
//           channel.sendToQueue(
//             "MoneyToWallet",
//             Buffer.from(JSON.stringify(addToWallet)),
//             {
//               persistent: true, // Ensures message is not lost if RabbitMQ restarts
//             }
//           );
  
//           console.log(
//             `✅ Add money to wallet Published to Queue:`,
//             addToWallet
//           );
//           await channel.close();
//           await connection.close();
//       } catch (error) {
//           console.error('❌ Error publishing order:', error);
//       }
// }

// async function waitWalletQueue(addToWallet) {
//   try {
//     const connection = await amqp.connect({
//       protocol: "amqp",
//       hostname: "rabbitmq",
//       port: 5672,
//       username: "admin",
//       password: "admin",
//       vhost: "/",
//     });

//     const channel = await connection.createChannel();

//     await channel.assertQueue("MoneyToWalletReponse", { durable: true });

//     // Send the order to the queue
//     channel.consume(
//       "MoneyToWalletResponse",
//       async (msg) => {
//         if (msg !== null) {
//           try {
//             const response = JSON.parse(msg.content.toString());
//             console.log(`📥 Add to wallet Done`, addToWallet);

//           if (response.wallet_tx_id === addToWallet.wallet_tx_id) {
//             clearTimeout(timeoutId);
//             channel.ack(msg);
//             resolve(response);
//           } else {
//             channel.nack(msg, false, true); // Put back if not the right order
//           }

//             // const response = {
//             //   user_id: addToWallet.user_id,
//             //   amount: addToWallet.amount,
//             //   is_buy: addToWallet.is_buy,
//             //   stock_tx_id: addToWallet.stock_tx_id,
//             //   wallet_tx_id: addToWallet.wallet_tx_id,
//             // };

//             console.log("Add to wallet Response: ", addToWallet);

//             console.log(
//               `📤 add to wallet response for ${addToWallet}`
//             );

//             channel.ack(msg); // ✅ Acknowledge message on success

//             console.log("matchingConsumer response: ", response);
//             return response;
//           } catch (error) {
//             console.error("❌ Error processing order:", error);
//             channel.nack(msg, false, false); // ❌ Reject the message (do not requeue)
//           }
//         }
//       },
//       { noAck: false }
//     );
//   } catch (error) {
//     console.error("❌ Error publishing order:", error);
//   }
// }
  
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

    publishToWalletQueue({
      user_id: user_id,
      amount: amount,
      is_buy: is_buy,
      stock_tx_id: stock_tx_id,
      wallet_tx_id: wallet_tx_id
    });

    // const walletResponse = await axios.post(
    //   `${transactionServiceUrl}/updateWallet`,
    //   { 
    //     user_id, 
    //     amount, 
    //     is_buy, 
    //     stock_tx_id, 
    //     wallet_tx_id 
    //   },
    //   {
    //     headers: { 
    //       "token": SERVICE_AUTH_TOKEN
    //     }
    //   }
    // );

    console.log("✅ Add money to wallet already publish");
    // waitWalletQueue(wallet_tx_id);

    // if (walletResponse.data.success) {
    //   console.log(`💰 Wallet updated for user ${user_id}: ${is_buy ? "-" : "+"}$${amount}`);
    //   return { success: true };
    // } else {
    //   console.error(`⚠️ Failed to update wallet for user ${user_id}:`, walletResponse.data);
    //   return { success: false, message: walletResponse.data.message };
    // }
    return "success"
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

    publishToStockPortfolio({
      user_id: user_id,
      stock_id: stock_id,
      quantity: quantity,
      is_buy: is_buy
    });

    // const portfolioResponse = await axios.post(
    //   `${transactionServiceUrl}/updateStockPortfolio`,
    //   {
    //     user_id: user_id,
    //     stock_id: stock_id,
    //     quantity: quantity,
    //     is_buy: is_buy
    //   },
    //   {
    //     headers: {
    //       "token": SERVICE_AUTH_TOKEN
    //     },
    //   }
    // );

    // if (portfolioResponse.data.success) {
    //   console.log(`📈 Portfolio updated for user ${user_id}: +${quantity} shares of ${stock_id}`);
    //   return { success: true };
    // } else {
    //   console.error(`⚠️ Failed to update portfolio for user ${user_id}`);
    //   return { success: false, message: portfolioResponse.data.message };
    // }
    return "success"
  } catch (error) {
    console.error(`❌ Error updating stock portfolio for user ${user_id}:`, error);
    return { success: false, message: error.response?.data?.error || "Unknown error" };
  }
}



module.exports = { matchOrder };

