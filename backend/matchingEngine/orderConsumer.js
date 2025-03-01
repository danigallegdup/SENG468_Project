// backend/consumers/orderConsumer.js
// RabbitMQ consumer to process incoming orders

const amqp = require("amqplib");
const { matchOrders } = require("../services/matchingService");

// Function to start listening for orders from RabbitMQ
async function startConsumer() {
    try {
        // Connect to RabbitMQ
        const connection = await amqp.connect("amqp://localhost");
        const channel = await connection.createChannel();

        // Ensure the order queue exists
        await channel.assertQueue("order_queue", { durable: true });

        console.log("Waiting for orders...");

        // Consume messages from the order queue
        channel.consume("order_queue", async (msg) => {
            const order = JSON.parse(msg.content.toString());
            console.log(`Processing order: ${order._id}`);

            // Attempt to match the order
            await matchOrders(order.stock_id);

            // Acknowledge message processing
            channel.ack(msg);
        });
    } catch (error) {
        console.error("RabbitMQ Consumer Error:", error);
    }
}

// Start the consumer
startConsumer().catch(console.error);
