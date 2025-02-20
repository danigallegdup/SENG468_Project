const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq"; // Use service name for Docker

let connection;
let channel;

// Function to establish a RabbitMQ connection
async function connectRabbitMQ() {
    try {
        console.log(`🔍 Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        await channel.assertQueue("order_queue", { durable: true });

        console.log("✅ Successfully connected to RabbitMQ!");

        return { connection, channel };
    } catch (error) {
        console.error("❌ RabbitMQ Connection Failed:", error.message);
        console.error("⚠️ Retrying in 5 seconds...");
        setTimeout(connectRabbitMQ, 5000); // Retry connection every 5 seconds
    }
}

// Function to publish an order message to RabbitMQ
async function publishOrder(order) {
    try {
        if (!channel) {
            console.error("❌ RabbitMQ channel is not available. Cannot publish order.");
            return;
        }

        channel.sendToQueue("order_queue", Buffer.from(JSON.stringify(order)), { persistent: true });
        console.log(`📤 Order Published: ${order._id}`);
    } catch (error) {
        console.error("❌ RabbitMQ Publish Error:", error.message);
    }
}

// Ensure RabbitMQ connects at startup
connectRabbitMQ();

module.exp
