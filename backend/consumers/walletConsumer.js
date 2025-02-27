// backend/consumers/walletConsumer.js

const amqp = require("amqplib");
const WalletTransaction = require("../models/WalletTransaction");
const Wallet = require("../models/Wallet");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";
const QUEUE_NAME = "wallet_queue";

async function consumeWalletTransactions() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log("✅ Wallet consumer listening for transactions...");

        channel.consume(QUEUE_NAME, async (msg) => {
            const transaction = JSON.parse(msg.content.toString());
            console.log("📥 Processing wallet transaction:", transaction);

            try {
                // Ensure wallet exists
                let wallet = await Wallet.findOne({ userId: transaction.userId });
                if (!wallet) {
                    console.error("❌ Wallet not found for user", transaction.userId);
                    return channel.nack(msg, false, false); // Discard message
                }

                // Ensure sufficient balance for withdrawals
                if (transaction.type === "withdrawal" && wallet.balance < transaction.amount) {
                    console.error("❌ Insufficient funds for withdrawal:", transaction.amount);
                    return channel.nack(msg, false, false); // Discard message
                }

                // Atomic wallet update to prevent race conditions
                const session = await Wallet.startSession();
                session.startTransaction();

                try {
                    // Update balance
                    wallet.balance += transaction.type === "deposit" ? transaction.amount : -transaction.amount;
                    await wallet.save({ session });

                    // Save transaction record
                    await WalletTransaction.create([{ ...transaction, balance: wallet.balance }], { session });

                    await session.commitTransaction();
                    session.endSession();

                    console.log("✅ Wallet transaction completed for user:", transaction.userId);
                    channel.ack(msg);
                } catch (err) {
                    await session.abortTransaction();
                    session.endSession();
                    throw err;
                }
            } catch (error) {
                console.error("❌ Error processing wallet transaction:", error);
                channel.nack(msg, false, true); // Requeue message for retry
            }
        });
    } catch (error) {
        console.error("❌ Error in wallet consumer:", error);
    }
}

// Start the consumer
consumeWalletTransactions();
