// src/lib/lock.ts
import { redis } from "./redis";
import type Redis from "ioredis";

const LOCK_TTL_MS = 10_000;

const localLocks = new Map<string, NodeJS.Timeout>();

export async function acquireLock(
  key: string,
  ttlMs: number = LOCK_TTL_MS
): Promise<(() => Promise<void>) | null> {
  const lockKey = `lock:${key}`;
  const token = `${Date.now()}-${Math.random()}`;

  if (redis) {
    const r: Redis = redis;
    const result = await r.set(lockKey, token, "PX", ttlMs, "NX");
    if (result !== "OK") return null;

    return async () => {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await r.eval(script, 1, lockKey, token);
    };
  }

  if (localLocks.has(lockKey)) return null;
  const timer = setTimeout(() => localLocks.delete(lockKey), ttlMs);
  localLocks.set(lockKey, timer);

  return async () => {
    const t = localLocks.get(lockKey);
    if (t) clearTimeout(t);
    localLocks.delete(lockKey);
  };
}