/*
producer.js: RabbitMQ producer for the Order Service.
             When a user places an order, the producer
             publishes it to the queue for processing
             within consumer.js.
*/

const amqp = require('amqplib');
const redisClient = require("./redis");

/**
 * Publishes an order to the RabbitMQ queue.
 * @param {Object} order - The order details.
 */

async function publishOrder(order) {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: "rabbitmq",
      port: 5672,
      username: "admin",
      password: "admin",
      vhost: "/"
    });

    const channel = await connection.createChannel();

    const routingKey = `orders.${order.stock_id}`;
    await channel.assertQueue(routingKey, { durable: true });

    channel.sendToQueue(routingKey, Buffer.from(JSON.stringify(order)), {
      persistent: true,
    });

    await redisClient.sadd("active_stock_ids", order.stock_id);
    console.log(`✅ Published to [${routingKey}]:`, order.stock_tx_id);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("❌ Error publishing order:", error);
  }
}

module.exports = { publishOrder };
