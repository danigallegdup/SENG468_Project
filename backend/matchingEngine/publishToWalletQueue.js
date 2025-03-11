const amqp = require("amqplib");

async function publishToWalletQueue(addToWallet) {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: "rabbitmq",
      port: 5672,
      username: "admin",
      password: "admin",
      vhost: "/",
    });

    const channel = await connection.createChannel();

    await channel.assertQueue("MoneyToWallet", { durable: true });

    // Send the order to the queue
    channel.sendToQueue(
      "MoneyToWallet",
      Buffer.from(JSON.stringify(addToWallet)),
      {
        persistent: true, // Ensures message is not lost if RabbitMQ restarts
      }
    );

    console.log(`✅ Add money to wallet Published to Queue:`, addToWallet);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("❌ Error publishing wallet update:", error);
  }
}

module.exports = { publishToWalletQueue };
