const amqp = require("amqplib");        // Import RabbitMQ

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq"; // Use service name for Docker

let connection;
let channel;

// Function to publish an order message to RabbitMQ
async function publishOrder(order) {
    try {
        // Connect to RabbitMQ
        console.log(`🔍 Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        // Ensure the order queue exists
        await channel.assertQueue("order_queue", { durable: true });

        // Send the order message to the queue
        channel.sendToQueue("order_queue", Buffer.from(JSON.stringify(order)), { persistent: true });

        console.log(`Order Published: ${order._id}`);

        // Close the connection
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error("RabbitMQ Error:", error);
    }
}

// Export the publish function for order placement
module.exports = { publishOrder };
