/*
orderResponseConsumer.js: For use in order service. Listens for order matching results from Matching Engine.
*/

const { connectRabbitMQ } = require("./rabbitmq");

const RESPONSE_QUEUE = 'order_responses';
const redisClient = require("./redis"); // Import Redis


/**
 * Waits for an order response from the Matching Engine
 */
async function waitForOrderResponse(timeout = 5000) {
  return new Promise(async (resolve) => {
    const {connection, channel} = await connectRabbitMQ();
    await channel.assertQueue(RESPONSE_QUEUE, { durable: true });

    const timeoutId = setTimeout(() => {
      console.log(`Timeout waiting for order`);
      resolve(null);
    }, timeout);

    channel.consume(RESPONSE_QUEUE, async (msg) => {
      if (msg !== null) {
        const response = JSON.parse(msg.content.toString());
        await redisClient.zadd(
          `stock_transactions:${response.user_id}`,
          timestamp,
          JSON.stringify({
            ...newOrder,
            order_status: "COMPLETED",
            stock_price: response.stock_price,
            wallet_tx_id: response.wallet_tx_id,
          })
        );
        // if (response.stock_tx_id === stock_tx_id) {
        clearTimeout(timeoutId);
        channel.ack(msg);
        resolve(response);
        // } else {
        //   channel.nack(msg, false, true); // Put back if not the right order
        // }
      }
    }, { noAck: false });
  });
}

module.exports = { waitForOrderResponse };
