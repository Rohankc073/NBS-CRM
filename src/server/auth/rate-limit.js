// In-memory rate limiter. Fine for a single server — which is what you
// have. If you ever run more than one instance, the counts won't be
// shared across them, and this is the file you swap for Redis. The
// function signature stays identical, so nothing else changes.

const buckets = new Map();

// Sweep expired entries every 5 minutes so the Map doesn't grow forever.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.resetAt < now) buckets.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.(); // unref: don't keep the process alive just for this

/**
 * @param key      what we're counting — e.g. `login:ip:1.2.3.4`
 * @param limit    max attempts allowed in the window
 * @param windowMs how long the window lasts
 * @returns { allowed, remaining, retryAfterSec }
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}
