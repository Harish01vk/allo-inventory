// src/lib/redis.ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL not set — distributed locking disabled (dev mode)");
    return null;
  }
  const client = new Redis(url, { maxRetriesPerRequest: 3 });
  client.on("error", (err) => console.error("[Redis]", err));
  return client;
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : (globalForRedis.redis = createRedis());