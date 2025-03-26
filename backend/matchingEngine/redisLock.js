const { default: Redlock } = require('redlock');
const redisClient = require("./redis");

const redlock = new Redlock(
  [redisClient],
  {
    driftFactor: 0.01,            // Time factor for clock drift
    retryCount: 10,               // Retry up to 10 times
    retryDelay: 200,              // Wait 200ms between retries
    retryJitter: 100,             // Add random jitter up to 100ms
  }
);

redlock.on("clientError", (err) => {
  console.error("❌ Redis client error in Redlock:", err);
});

/**
 * Attempts to acquire a lock for the given stock key
 * @param {string} resource - The resource key e.g. "stock:Google"
 * @param {number} ttl - Time to live in ms
 * @returns {Promise<Lock|null>}
 */
async function acquireLock(resource, ttl = 5000) {
  try {
    const lock = await redlock.acquire([resource], ttl);
    return lock;
  } catch (err) {
    console.warn(`⚠️ Could not acquire Redlock for ${resource}`);
    return null;
  }
}

/**
 * Releases a previously acquired Redlock
 * @param {Lock} lock
 */
async function releaseLock(lock) {
  if (!lock) return;
  try {
    await lock.release();
  } catch (err) {
    console.error("❌ Error releasing Redlock:", err);
  }
}

module.exports = {
  acquireLock,
  releaseLock,
};
