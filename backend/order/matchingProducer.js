/*
producer.js: RabbitMQ producer for the Order Service.
             When a user places an order, the producer
             publishes it to the queue for processing
             within consumer.js.
*/

const amqp = require('amqplib');

const QUEUE_NAME = 'orders';

/**
 * Publishes an order to the RabbitMQ queue.
 * @param {Object} order - The order details.
 */
async function publishOrder(order) {
    try {
        const connection = await amqp.connect({
            protocol: 'amqp',
            hostname: 'rabbitmq',
            port: 5672,
            username: 'admin',
            password: 'admin',
            vhost: '/'
        });

        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Send the order to the queue
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(order)), {
            persistent: false
        });

        console.log(`✅ Order Published to Queue:`, order);
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('❌ Error publishing order:', error);
    }
}

module.exports = { publishOrder };
