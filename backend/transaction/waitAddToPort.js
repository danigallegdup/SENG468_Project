/*
orderResponseConsumer.js: For use in order service. Listens for order matching results from Matching Engine.
*/

// const { connectRabbitMQ } = require("./rabbitmq");
const amqp = require("amqplib");

const REQUEST_QUEUE = "UpdateStockPortfolio";
// const RESPONSE_QUEUE = "MoneyToWalletResponse";
const stockController = require("./controllers/stockController");

/**
 * Waits for an order response from the Matching Engine
 */
async function updateStockPortfolioAsync(timeout = 5000) {
  return new Promise(async (resolve) => {
    const connection = await amqp.connect({
                protocol: 'amqp',
                hostname: 'rabbitmq',
                port: 5002,
                username: 'admin',
                password: 'admin',
                vhost: '/'
            });

    const channel = await connection.createChannel();

     await channel.assertQueue(REQUEST_QUEUE, { durable: true });
    // await channel.assertQueue(RESPONSE_QUEUE, { durable: true });

    // const timeoutId = setTimeout(() => {
    //   console.log(`Timeout waiting for update wallet}`);
    //   resolve(null);
    // }, timeout);

    channel.consume(
      REQUEST_QUEUE,
      async (msg) => {
        if (msg !== null) {
          const response = JSON.parse(msg.content.toString());

          console.log("Received update Stock Portfolio request", response);
          const data = await stockController.updateStockPortfolio(response);
          console.log("Stock Portfolio Data successful", data);
          if (data !== null) {
            channel.ack(msg);
            resolve(response);
          } else {
            console.log("Failed to update portfolio");
          }
        }
      },
      { noAck: false }
    );
  });
}

module.exports = { updateStockPortfolioAsync };
