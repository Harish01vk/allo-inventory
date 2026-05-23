// src/lib/idempotency.ts
import { redis } from "./redis";

const TTL_SECONDS = 86_400; // 24 h

/**
 * Check the idempotency store. Returns a cached response body if one exists,
 * otherwise returns null and stores the provided response once you call `store`.
 */
export async function getIdempotentResponse(key: string): Promise<object | null> {
  if (!redis) return null;
  const cached = await redis.get(`idempotency:${key}`);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function storeIdempotentResponse(key: string, body: object): Promise<void> {
  if (!redis) return;
  await redis.set(`idempotency:${key}`, JSON.stringify(body), "EX", TTL_SECONDS);
}
