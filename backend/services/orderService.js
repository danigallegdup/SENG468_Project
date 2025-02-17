const redis = require("../config/redis");
const { connectDB } = require("../config/db");
const { publishOrder } = require("../config/rabbitmq");

// Deduct funds for buy order or stocks for sell order
async function processUserFunds(order, db) {
    const user = await db.collection("users").findOne({ _id: order.user_id });

    if (!user) throw new Error("User not found");

    if (order.is_buy) {
        const totalCost = order.quantity * order.price;
        if (user.wallet_balance < totalCost) {
            throw new Error("Insufficient funds");
        }
        await db.collection("users").updateOne(
            { _id: order.user_id },
            { $inc: { wallet_balance: -totalCost } }
        );
    } else {
        const userStock = await db.collection("user_stocks").findOne({
            user_id: order.user_id,
            stock_id: order.stock_id,
        });

        if (!userStock || userStock.quantity < order.quantity) {
            throw new Error("Insufficient stocks to sell");
        }

        await db.collection("user_stocks").updateOne(
            { user_id: order.user_id, stock_id: order.stock_id },
            { $inc: { quantity: -order.quantity } }
        );
    }
}

// Add an order to Redis
async function addOrderToRedis(order) {
    const key = order.is_buy ? `buy_orders:${order.stock_id}` : `sell_orders:${order.stock_id}`;
    await redis.zadd(key, order.price, JSON.stringify(order));
}

// Remove an order from Redis
async function removeOrderFromRedis(order) {
    const key = order.is_buy ? `buy_orders:${order.stock_id}` : `sell_orders:${order.stock_id}`;
    await redis.zrem(key, JSON.stringify(order));
}

// Insert a new order into MongoDB
async function insertOrderIntoDB(order, db) {
    const result = await db.collection("orders").insertOne(order);
    return result.insertedId;
}

// Refund user if a market order fails to fill
async function refundUser(order, db) {
    if (order.is_buy) {
        await db.collection("users").updateOne(
            { _id: order.user_id },
            { $inc: { wallet_balance: order.quantity * order.price } }
        );
    } else {
        await db.collection("user_stocks").updateOne(
            { user_id: order.user_id, stock_id: order.stock_id },
            { $inc: { quantity: order.quantity } }
        );
    }
}

// Process a new order
async function processOrder(order) {
    const db = await connectDB();

    try {
        await processUserFunds(order, db);

        // Insert order into the database with "IN_PROGRESS" status
        order.status = "IN_PROGRESS";
        order.created_at = new Date();
        order._id = await insertOrderIntoDB(order, db);

        await addOrderToRedis(order);
        await publishOrder(order); // Send order to RabbitMQ for matching

    } catch (error) {
        console.error(`Order Processing Error: ${error.message}`);
        await refundUser(order, db);
        return { success: false, message: error.message };
    }

    return { success: true, order_id: order._id };
}

// Cancel an order before fulfillment
async function cancelOrder(order_id) {
    const db = await connectDB();
    const order = await db.collection("orders").findOne({ _id: order_id });

    if (!order || order.status !== "IN_PROGRESS") {
        return { success: false, message: "Order not found or already completed" };
    }

    await removeOrderFromRedis(order);
    await refundUser(order, db);

    await db.collection("orders").updateOne(
        { _id: order_id },
        { $set: { status: "CANCELLED" } }
    );

    return { success: true, message: "Order cancelled" };
}

module.exports = { processOrder, cancelOrder };
