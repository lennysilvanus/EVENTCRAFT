import Redis from "ioredis";

let _redis: Redis | null = null;

/**
 * Returns a shared Redis client if REDIS_URL is configured, otherwise null.
 * All callers must handle the null case (fall back to database).
 */
export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    _redis.on("error", (err) => {
      console.error("[redis] connection error — rate limiting will fall back to database:", err.message);
    });
  }

  return _redis;
}
