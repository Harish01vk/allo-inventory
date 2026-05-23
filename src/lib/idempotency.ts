import { redis } from "./redis";

const TTL_SECONDS = 86_400;

export async function getIdempotentResponse(key: string): Promise<object | null> {
  if (!redis) return null;
  const r = redis;
  const cached = await r.get(`idempotency:${key}`);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function storeIdempotentResponse(key: string, body: object): Promise<void> {
  if (!redis) return;
  const r = redis;
  await r.set(`idempotency:${key}`, JSON.stringify(body), "EX", TTL_SECONDS);
}