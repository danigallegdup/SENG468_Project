/*
rabbitmq.js: Responsible for connecting to RabbitMQ.
             Used by the Order Service and Matching Engine.
*/

const amqp = require("amqplib");

let channel;
const queueName = "orderQueue";

// Connect to RabbitMQ
async function connectRabbitMQ() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  await channel.assertQueue(queueName, { durable: true });
  console.log("✅ RabbitMQ connected");
}

// Publish order to RabbitMQ queue
async function publishOrder(order) {
  if (!channel) await connectRabbitMQ();
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(order)), { persistent: true });
  console.log(`📩 Order Queued: ${order.stock_tx_id}`);
}

// Consume orders from RabbitMQ queue
async function consumeOrders(callback) {
  if (!channel) await connectRabbitMQ();
  channel.consume(queueName, (msg) => {
    const order = JSON.parse(msg.content.toString());
    callback(order);
    channel.ack(msg); // Acknowledge message processing
  });
}

connectRabbitMQ();

module.exports = { publishOrder, consumeOrders };
