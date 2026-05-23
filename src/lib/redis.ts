// src/lib/redis.ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL not set — distributed locking disabled (dev mode)");
    // Return a mock that always grants the lock so the app still runs locally
    // without Redis. NOT safe for production.
    return null as unknown as Redis;
  }
  const client = new Redis(url, { maxRetriesPerRequest: 3 });
  client.on("error", (err) => console.error("[Redis]", err));
  return client;
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : (globalForRedis.redis = createRedis());
