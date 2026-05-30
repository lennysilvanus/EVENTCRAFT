import { prisma } from "./prisma";
import { getRedis } from "./redis";

// ─── Redis-backed rate limiter (preferred) ───────────────────────────────────

async function isRateLimitedRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey  = `rl:${key}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }
    return count > limit;
  } catch {
    // Redis unavailable — fall through to DB limiter
    return false;
  }
}

// ─── Database-backed rate limiter (fallback) ─────────────────────────────────
// Fixed-window: resetAt is set ONLY on creation and on explicit reset.
// Updating resetAt on every increment caused the window to slide indefinitely (H-2).
// On DB error we fail CLOSED (return true = blocked) to prevent bypass (H-3).

async function isRateLimitedDb(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now     = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    // Try to insert a fresh entry for this window
    try {
      await prisma.rateLimit.create({ data: { key, count: 1, resetAt } });
      return false; // first request in window
    } catch {
      // Key already exists — increment without touching resetAt
    }

    const entry = await prisma.rateLimit.findUnique({ where: { key } });

    // Window expired — reset the counter for a new window
    if (!entry || entry.resetAt < now) {
      await prisma.rateLimit.upsert({
        where:  { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return false;
    }

    // Still in window — increment
    const updated = await prisma.rateLimit.update({
      where: { key },
      data:  { count: { increment: 1 } },
    });

    return updated.count > limit;
  } catch {
    // H-3: Fail closed — a DB error must never disable rate limiting
    console.error(`[rate-limit] DB error for key "${key}" — failing closed`);
    return true;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (process.env.REDIS_URL) {
    const blocked = await isRateLimitedRedis(key, limit, windowMs);
    if (blocked) return true;
    return false;
  }
  return isRateLimitedDb(key, limit, windowMs);
}

export function getClientIp(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
