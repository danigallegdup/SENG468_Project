// services/matchingService.js

const redis = require("../config/redis");
const { connectDB } = require("../config/Mongo_connect");

// Function to process market buy orders
async function processMarketBuyOrder(order) {
    const sellKey = `sell_orders:${order.stock_id}`;
    const db = await connectDB();

    while (order.quantity > 0) {
        const bestSell = await redis.zrange(sellKey, 0, 0, "WITHSCORES");

        if (!bestSell || bestSell.length === 0) {
            console.log(`No available sell orders for ${order.stock_id}. Refunding user.`);
            await refundUser(order, db);
            return;
        }

        const sellOrder = JSON.parse(bestSell[0]);

        if (sellOrder.price > order.price) {
            console.log(`No matching sell order found at desired price.`);
            await refundUser(order, db);
            return;
        }

        const tradedQuantity = Math.min(order.quantity, sellOrder.quantity);
        await executeTrade(order, sellOrder, tradedQuantity, db);

        order.quantity -= tradedQuantity;
        sellOrder.quantity -= tradedQuantity;

        if (sellOrder.quantity === 0) {
            await redis.zrem(sellKey, JSON.stringify(sellOrder));
        } else {
            await redis.zadd(sellKey, sellOrder.price, JSON.stringify(sellOrder));
        }
    }
}

// Function to process limit sell orders (insert into Redis)
async function processLimitSellOrder(order) {
    const sellKey = `sell_orders:${order.stock_id}`;
    await redis.zadd(sellKey, order.price, JSON.stringify(order));
    console.log(`Limit Sell Order added to Redis: ${order.quantity} shares @ $${order.price}`);

    const db = await connectDB();
    const bestBuy = await redis.zrevrange(`buy_orders:${order.stock_id}`, 0, 0, "WITHSCORES");

    if (!bestBuy || bestBuy.length === 0) return;

    const buyOrder = JSON.parse(bestBuy[0]);

    if (buyOrder.price >= order.price) {
        const tradedQuantity = Math.min(buyOrder.quantity, order.quantity);
        await executeTrade(buyOrder, order, tradedQuantity, db);

        buyOrder.quantity -= tradedQuantity;
        order.quantity -= tradedQuantity;

        if (buyOrder.quantity === 0) {
            await redis.zrem(`buy_orders:${order.stock_id}`, JSON.stringify(buyOrder));
        }

        if (order.quantity === 0) {
            await redis.zrem(sellKey, JSON.stringify(order));
        } else {
            await redis.zadd(sellKey, order.price, JSON.stringify(order));
        }
    }
}

// Function to execute a trade
async function executeTrade(buyOrder, sellOrder, quantity, db) {
    const tradePrice = buyOrder.stock_price || sellOrder.stock_price;

    console.log(`🔍 DEBUG: Executing trade - ${quantity} shares at $${tradePrice}`);
    console.log(`🔍 DEBUG: Initial buyOrder quantity: ${buyOrder.quantity}, sellOrder quantity: ${sellOrder.quantity}`);

    // Insert trade record
    await db.collection("transactions").insertOne({
        buy_order_id: buyOrder._id,
        sell_order_id: sellOrder._id,
        stock_id: buyOrder.stock_id,
        quantity,
        price: tradePrice,
        created_at: new Date()
    });

    // **🔹 Ensure stock price updates**
    await db.collection("stocks").updateOne(
        { _id: buyOrder.stock_id },
        { $set: { latest_price: tradePrice } },
        { upsert: true } // Ensure stock exists
    );

    console.log(`✅ DEBUG: Stock price updated to ${tradePrice} for stock_id ${buyOrder.stock_id}`);

    // **🔹 Reduce order quantities**
    await db.collection("orders").updateOne(
        { _id: buyOrder._id },
        { $inc: { quantity: -quantity } }
    );

    await db.collection("orders").updateOne(
        { _id: sellOrder._id },
        { $inc: { quantity: -quantity } }
    );

    // **🔹 Fetch the updated orders to check the new quantity**
    const updatedBuyOrder = await db.collection("orders").findOne({ _id: buyOrder._id });
    const updatedSellOrder = await db.collection("orders").findOne({ _id: sellOrder._id });

    console.log(`🔍 DEBUG: Updated buyOrder quantity: ${updatedBuyOrder.quantity}, Updated sellOrder quantity: ${updatedSellOrder.quantity}`);

    // **🔹 Ensure orders transition to COMPLETED if fully matched**
    if (updatedBuyOrder.quantity <= 0) {
        await db.collection("orders").updateOne(
            { _id: buyOrder._id },
            { $set: { order_status: "COMPLETED", stock_price: tradePrice } }
        );
        console.log(`✅ DEBUG: Buy order ${buyOrder._id} marked as COMPLETED`);
    }

    if (updatedSellOrder.quantity <= 0) {
        await db.collection("orders").updateOne(
            { _id: sellOrder._id },
            { $set: { order_status: "COMPLETED", stock_price: tradePrice } }
        );
        console.log(`✅ DEBUG: Sell order ${sellOrder._id} marked as COMPLETED`);
    }
}


// Refund the user if a market buy fails
async function refundUser(order, db) {
    await db.collection("users").updateOne(
        { _id: order.user_id },
        { $inc: { wallet_balance: order.quantity * order.price } }
    );
    console.log(`Refunded $${order.quantity * order.price} to user ${order.user_id}`);
}

module.exports = { processMarketBuyOrder, processLimitSellOrder };
