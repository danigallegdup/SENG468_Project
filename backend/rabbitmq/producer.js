/*
producer.js: RabbitMQ producer for the Order Service.
             When a user places an order, the producer
             publishes it to the queue for processing
             within consumer.js.
*/

const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'orders';

/**
 * Publishes an order to the RabbitMQ queue.
 * @param {Object} order - The order details.
 */
async function publishOrder(order) {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Send the order to the queue
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(order)), {
            persistent: true // Ensures message is not lost if RabbitMQ restarts
        });

        console.log(`✅ Order Published to Queue:`, order);
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('❌ Error publishing order:', error);
    }
}

module.exports = { publishOrder };
