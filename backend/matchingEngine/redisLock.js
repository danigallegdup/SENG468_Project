const redis = require('./redis');

/**
 * Acquire a lock on a key for a short TTL (defaults to 5s)
 */
async function acquireLock(key, ttl = 5000) {
  const lockKey = `lock:${key}`;
  const lockVal = `${Date.now()}-${Math.random()}`;
  const result = await redis.set(lockKey, lockVal, 'NX', 'PX', ttl);
  return result ? lockVal : null;
}

/**
 * Release lock only if it matches the original value
 */
async function releaseLock(key, value) {
  const lockKey = `lock:${key}`;
  const currentVal = await redis.get(lockKey);
  if (currentVal === value) {
    await redis.del(lockKey);
  }
}

module.exports = { acquireLock, releaseLock };
