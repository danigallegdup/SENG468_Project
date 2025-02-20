const amqp = require("amqplib");        // Import RabbitMQ

// Function to publish an order message to RabbitMQ
async function publishOrder(order) {
    try {
        // Connect to RabbitMQ
        const connection = await amqp.connect("amqp://rabbitmq");
        const channel = await connection.createChannel();

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
