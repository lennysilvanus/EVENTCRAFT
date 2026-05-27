interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Returns true if the request should be blocked.
 * @param key    — unique key (e.g. "login:1.2.3.4")
 * @param limit  — max requests per window
 * @param windowMs — window in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > limit) return true;
  return false;
}

export function getClientIp(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
