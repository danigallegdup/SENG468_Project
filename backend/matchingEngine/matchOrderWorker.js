const { parentPort, workerData } = require("worker_threads");
const { matchOrder } = require("./matchOrder");

(async () => {
    try {
        console.log("🔄 Worker received order:", workerData);

        const result = await matchOrder(workerData);

        console.log("✅ Worker completed order matching:", result);
        parentPort.postMessage(result);
    } catch (error) {
        console.error("❌ Worker Error:", error);
        process.exit(1);
    }
})();
