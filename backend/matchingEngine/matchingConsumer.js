/*
consumer.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/

const amqp = require('amqplib');
const { matchOrder } = require('../matchingEngine/matchOrder'); // Matching logic

const ORDER_QUEUE = 'orders';
const RESPONSE_QUEUE = 'order_responses';

/**
 * Consumes (processes) orders from the RabbitMQ queue.
 */
async function consumeOrders() {
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

        await channel.assertQueue(ORDER_QUEUE, { durable: true });
        await channel.assertQueue(RESPONSE_QUEUE, { durable: true });

        console.log('✅ Waiting for orders...');

        channel.consume(ORDER_QUEUE, async (msg) => {
            if (msg !== null) {
                try {
                    const order = JSON.parse(msg.content.toString());
                    console.log(`📥 Received Order:`, order);

                    const matchResult = await matchOrder(order); // Match the order

                    const response = {
                        stock_tx_id: order.stock_tx_id,
                        matched: matchResult.matched,
                        expense: matchResult.expense,
                        stock_price: matchResult.stock_price,
                        wallet_tx_id: matchResult.wallet_tx_id
                    };

                    console.log("Matching Consumer Response: ", response);

                    channel.sendToQueue(RESPONSE_QUEUE, Buffer.from(JSON.stringify(response)), { persistent: true });
                    console.log(`📤 Sent order response for ${order.stock_tx_id}: ${response.matched ? 'Matched' : 'Not Matched'}`);

                    channel.ack(msg); // ✅ Acknowledge message on success

                    console.log("matchingConsumer response: ", response);
                    return response;

                } catch (error) {
                    console.error("❌ Error processing order:", error);
                    channel.nack(msg, false, false); // ❌ Reject the message (do not requeue)
                }
            }
        }, { noAck: false });

    } catch (error) {
        console.error('❌ Error consuming orders:', error);
    }
}

module.exports = { consumeOrders };
