/*
orderResponseConsumer.js: For use in order service. Listens for order matching results from Matching Engine.
*/

const { connectRabbitMQ } = require("./rabbitmq");

const RESPONSE_QUEUE = 'order_responses';

/**
 * Waits for an order response from the Matching Engine
 */
async function waitForOrderResponse(stock_tx_id, timeout = 5000) {
  return new Promise(async (resolve) => {
    const {connection, channel} = await connectRabbitMQ();
    await channel.assertQueue(RESPONSE_QUEUE, { durable: true });

    const timeoutId = setTimeout(() => {
      console.log(`Timeout waiting for order ${stock_tx_id}`);
      resolve(null);
    }, timeout);

    channel.consume(RESPONSE_QUEUE, async (msg) => {
      if (msg !== null) {
        const response = JSON.parse(msg.content.toString());

        if (response.stock_tx_id === stock_tx_id) {
          clearTimeout(timeoutId);
          channel.ack(msg);
          resolve(response);
        } else {
          channel.nack(msg, false, true); // Put back if not the right order
        }
      }
    }, { noAck: false });
  });
}

module.exports = { waitForOrderResponse };
