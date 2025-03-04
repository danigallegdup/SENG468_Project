const amqp = require('amqplib');

let channel;

// Connect to RabbitMQ
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect({
      protocol: 'amqp',
      hostname: 'rabbitmq',
      port: 5672,
      username: 'admin',
      password: 'admin',
      vhost: '/'
    });
    channel = await connection.createChannel();
    await channel.assertQueue('orderQueue', { durable: true });
    console.log('✅ matchingEngine: RabbitMQ connected');
  } catch (error) {
    console.error('❌ matchingEngine: RabbitMQ connection error:', error);
  }
}

async function sendToQueue(message) {
  if (!channel) {
    await connectRabbitMQ();
  }
  channel.sendToQueue('orderQueue', Buffer.from(message), { persistent: true });
}

module.exports = { connectRabbitMQ, sendToQueue };
