import "server-only";

type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: Date;
};

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit({
  scope,
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucketKey = `${scope}:${key}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAtMs <= now) {
    const resetAtMs = now + windowMs;

    buckets.set(bucketKey, {
      count: 1,
      resetAtMs,
    });

    return {
      ok: true,
      remaining: Math.max(limit - 1, 0),
      resetAt: new Date(resetAtMs),
    };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: new Date(current.resetAtMs),
    };
  }

  current.count += 1;

  return {
    ok: true,
    remaining: Math.max(limit - current.count, 0),
    resetAt: new Date(current.resetAtMs),
  };
}
