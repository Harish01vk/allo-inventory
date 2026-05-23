// src/lib/lock.ts
import { redis } from "./redis";

const LOCK_TTL_MS = 10_000; // 10 seconds max hold

/**
 * Acquire a distributed lock via Redis SET NX EX.
 * Returns a release function, or null if the lock could not be acquired.
 *
 * When Redis is unavailable (dev without Redis), we fall back to a
 * per-process in-memory Map — safe for single-instance dev only.
 */

const localLocks = new Map<string, NodeJS.Timeout>();

export async function acquireLock(
  key: string,
  ttlMs: number = LOCK_TTL_MS
): Promise<(() => Promise<void>) | null> {
  const lockKey = `lock:${key}`;
  const token = `${Date.now()}-${Math.random()}`;

  if (redis) {
    // Redis path — atomically SET key token NX EX ttl
    const result = await redis.set(lockKey, token, "NX", "PX", ttlMs);
    if (result !== "OK") return null;

    return async () => {
      // Only delete if we still own the lock (Lua script for atomicity)
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await redis.eval(script, 1, lockKey, token);
    };
  }

  // Fallback: in-memory (single-process dev only)
  if (localLocks.has(lockKey)) return null;
  const timer = setTimeout(() => localLocks.delete(lockKey), ttlMs);
  localLocks.set(lockKey, timer);

  return async () => {
    const t = localLocks.get(lockKey);
    if (t) clearTimeout(t);
    localLocks.delete(lockKey);
  };
}
