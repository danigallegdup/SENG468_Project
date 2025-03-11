const amqp = require("amqplib");

async function publishToStockPortfolio(updatePort) {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: "rabbitmq",
      port: 5002,
      username: "admin",
      password: "admin",
      vhost: "/",
    });

    const channel = await connection.createChannel();

    await channel.assertQueue("UpdateStockPortfolio", { durable: true });

    // Send the order to the queue
    channel.sendToQueue(
      "UpdateStockPortfolio",
      Buffer.from(JSON.stringify(updatePort)),
      {
        persistent: true, // Ensures message is not lost if RabbitMQ restarts
      }
    );

    console.log(`✅ update stock portfolio Published to Queue:`, updatePort);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("❌ Error publishing stock portfolio update:", error);
  }
}

module.exports = { publishToStockPortfolio };
