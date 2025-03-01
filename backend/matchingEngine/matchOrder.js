/*
matchOrder.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/

const Order = require("./Order");
const { cacheStockPrice } = require("./redis");

/**
 * Matches incoming orders (Buy/Market) with Limit Sell orders.
 * Handles partial fulfillment.
 */
async function matchOrder(newOrder) {
  try {
    if (!newOrder.is_buy) return { matched: false }; // We only match Buy/Market orders

    // Find the lowest available Limit Sell order
    const lowestSellOrder = await Order.findOne({
      stock_id: newOrder.stock_id,
      is_buy: false,
      order_status: 'IN_PROGRESS'
    }).sort({ stock_price: 1 });

    if (!lowestSellOrder) {
      console.log("⚠️ No matching Sell orders found. Order remains IN_PROGRESS.");
      return { matched: false };
    }

    let remainingQuantity = newOrder.quantity;
    let executedQuantity = 0;

    // Match as much as possible with the lowest sell order
    if (lowestSellOrder.quantity <= remainingQuantity) {
      executedQuantity = lowestSellOrder.quantity;
      remainingQuantity -= executedQuantity;
      await Order.updateOne(
        { _id: lowestSellOrder._id },
        { $set: { order_status: "COMPLETED" } }
      );
    } else {
      executedQuantity = remainingQuantity;
      remainingQuantity = 0;
      await Order.updateOne(
        { _id: lowestSellOrder._id },
        { $inc: { quantity: -executedQuantity } }
      );
    }

    // Update new order status based on remaining quantity
    const newOrderStatus = remainingQuantity === 0 ? "COMPLETED" : "PARTIALLY_FILLED";
    await Order.updateOne(
      { _id: newOrder._id },
      { 
        $set: { 
          order_status: newOrderStatus, 
          stock_price: lowestSellOrder.stock_price 
        } 
      }
    );

    console.log(`✅ Order ${newOrder._id} matched: ${executedQuantity}/${newOrder.quantity} filled`);

    return { matched: true, executedQuantity, remainingQuantity };

  } catch (error) {
    console.error("❌ Error matching order:", error);
    return { matched: false };
  }
}

module.exports = { matchOrder };

