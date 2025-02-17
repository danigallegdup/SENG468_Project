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
    await db.collection("transactions").insertOne({
        buy_order_id: buyOrder._id,
        sell_order_id: sellOrder._id,
        stock_id: buyOrder.stock_id,
        quantity,
        price: buyOrder.price,
        created_at: new Date()
    });

    console.log(`Trade Executed: ${quantity} shares of ${buyOrder.stock_id} at $${buyOrder.price}`);

    await db.collection("users").updateOne(
        { _id: buyOrder.user_id },
        { $inc: { wallet_balance: -quantity * buyOrder.price } }
    );

    await db.collection("user_stocks").updateOne(
        { user_id: buyOrder.user_id, stock_id: buyOrder.stock_id },
        { $inc: { quantity } },
        { upsert: true }
    );

    await db.collection("users").updateOne(
        { _id: sellOrder.user_id },
        { $inc: { wallet_balance: quantity * buyOrder.price } }
    );
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
