const amqp = require('amqplib');
const { processOrder } = require('./orderMatcher');

async function consumeOrders() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  const QUEUE = "orderQueue";

  await channel.assertQueue(QUEUE, { durable: true });

  console.log("📥 Waiting for orders...");

  channel.consume(QUEUE, async (msg) => {
    if (msg !== null) {
      const order = JSON.parse(msg.content.toString());
      console.log(`✅ Processing order:`, order);
      await processOrder(order);
      channel.ack(msg);  // Acknowledge message
    }
  });
}

module.exports = { consumeOrders };
