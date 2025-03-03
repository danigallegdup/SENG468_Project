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

connectRabbitMQ();

module.exports = { publishOrder, consumeOrders };
