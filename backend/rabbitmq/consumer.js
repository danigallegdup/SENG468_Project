/*
consumer.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/

const amqp = require('amqplib');
const matchOrder = require('../matchingEngine/matchOrder'); // Matching logic

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'orders';

/**
 * Consumes (processes) orders from the RabbitMQ queue.
 */
async function consumeOrders() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log('✅ Waiting for orders...');

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const order = JSON.parse(msg.content.toString());
                console.log(`📥 Received Order:`, order);

                await matchOrder(order); // Process the order matching logic

                channel.ack(msg); // Acknowledge message to remove from queue
            }
        }, { noAck: false });

    } catch (error) {
        console.error('❌ Error consuming orders:', error);
    }
}

module.exports = { consumeOrders };
