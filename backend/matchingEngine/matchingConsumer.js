/*
consumer.js: RabbitMQ consumer for the Order Service.
             Consumes orders received from producer
             and sends orders to the matching engine.   
*/
const amqp = require("amqplib");
const { matchOrder } = require("./matchOrder");
const redisClient = require("./redis");

const CONSUMERS_PER_STOCK = 3;
const knownStocks = new Set();

async function startConsumersForStock(stockId) {
  if (knownStocks.has(stockId)) return;
  knownStocks.add(stockId);

  const queueName = `orders.${stockId}`;
  const connection = await amqp.connect({
    protocol: 'amqp',
    hostname: 'rabbitmq',
    port: 5672,
    username: 'admin',
    password: 'admin',
    vhost: '/'
  });

  for (let i = 0; i < CONSUMERS_PER_STOCK; i++) {
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });

    console.log(`Consumer ${i + 1} listening to ${queueName}...`);

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const order = JSON.parse(msg.content.toString());
          console.log(`📥 [${queueName}] Received:`, order);

          const matchResult = await matchOrder(order);

          const response = {
            stock_price: matchResult.stock_price,
            stock_tx_id: order.stock_tx_id,
            matched: matchResult.matched,
            wallet_tx_id: matchResult.wallet_tx_id,
            user_id: matchResult.user_id,
          };

          console.log("✅ Matching Consumer Response: ", response);

          /*const timestamp = new Date(order.created_at).getTime();

          await redisClient.zadd(
            `stock_transactions:${response.user_id}`,
            timestamp,
            JSON.stringify({
              ...order,
              order_status: "COMPLETED",
              stock_price: response.stock_price,
              wallet_tx_id: response.wallet_tx_id,
            })
          );

          console.log(`User ${response.user_id} stock_transactions updated`);*/

          // Optionally send back to another service
          // await channel.sendToQueue(RESPONSE_QUEUE, Buffer.from(JSON.stringify(response)), { persistent: true });

          channel.ack(msg);
        } catch (error) {
          console.error("❌ Error processing order:", error);
          channel.nack(msg, false, false); // Don’t requeue
        }
      }
    }, { noAck: false });
  }
}

module.exports = { startConsumersForStock };
