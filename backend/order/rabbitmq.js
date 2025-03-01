const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

async function publishOrder(orderData) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    const QUEUE = "orderQueue";
    await channel.assertQueue(QUEUE, { durable: true });

    channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(orderData)), {
      persistent: true,
    });

    console.log(`📩 Order sent to queue:`, orderData);

    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (err) {
    console.error("RabbitMQ Publish Error:", err);
  }
}

module.exports = { publishOrder };
