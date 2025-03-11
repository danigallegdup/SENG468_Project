const amqp = require("amqplib");
const { Worker } = require("worker_threads");
const os = require("os");
const path = require("path");

const ORDER_QUEUE = "orders";
const NUM_WORKERS = os.cpus().length; // Use number of CPU cores

async function createWorker(order) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "matchOrderWorker.js"), { workerData: order });

        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

async function consumeOrders() {
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
        await channel.assertQueue(ORDER_QUEUE, { durable: true });

        console.log(`✅ Worker Threads Initialized: ${NUM_WORKERS} Workers Ready`);
        console.log("✅ Waiting for orders...");

        channel.consume(
            ORDER_QUEUE,
            async (msg) => {
                if (msg !== null) {
                    try {
                        const order = JSON.parse(msg.content.toString());
                        console.log(`📥 Received Order:`, order);

                        // Offload order processing to worker thread
                        const matchResult = await createWorker(order);

                        console.log(`🔄 Worker matched order:`, matchResult);
                        channel.ack(msg); // ✅ Acknowledge message on success
                    } catch (error) {
                        console.error("❌ Error processing order:", error);
                        channel.nack(msg, false, false); // ❌ Reject the message (do not requeue)
                    }
                }
            },
            { noAck: false }
        );
    } catch (error) {
        console.error("❌ Error consuming orders:", error);
    }
}

consumeOrders();

module.exports = { consumeOrders };
