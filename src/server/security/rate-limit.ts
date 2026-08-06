import 'server-only';
import { createHash } from 'node:crypto';

interface RateLimitInput {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  provider: 'upstash' | 'memory';
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();

/**
 * Distributed rate limiting through an Upstash-compatible Redis REST API.
 * The memory implementation is deliberately restricted to development/test:
 * production fails closed when the distributed provider is not configured.
 */
export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return enforceUpstash(url, token, input);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('RATE_LIMIT_PROVIDER_REQUIRED');
  }
  return enforceMemory(input);
}

export function rateLimitIdentity(request: Request, subject: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const material = `${subject}|${forwarded || realIp || 'unknown'}`;
  return createHash('sha256').update(material).digest('hex');
}

async function enforceUpstash(
  baseUrl: string,
  token: string,
  input: RateLimitInput,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = Math.floor(now / (input.windowSeconds * 1_000));
  const key = `matriculapro:rl:${input.key}:${bucket}`;
  const response = await fetch(`${baseUrl}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, input.windowSeconds + 1],
    ]),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('RATE_LIMIT_PROVIDER_UNAVAILABLE');
  const payload = await response.json() as Array<{ result?: number }>;
  const count = Number(payload[0]?.result ?? input.limit + 1);
  const retryAfterSeconds = input.windowSeconds - Math.floor((now / 1_000) % input.windowSeconds);
  return {
    allowed: count <= input.limit,
    remaining: Math.max(0, input.limit - count),
    retryAfterSeconds,
    provider: 'upstash',
  };
}

function enforceMemory(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const current = memoryBuckets.get(input.key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + input.windowSeconds * 1_000 }
    : current;
  bucket.count += 1;
  memoryBuckets.set(input.key, bucket);
  if (memoryBuckets.size > 5_000) {
    for (const [key, value] of memoryBuckets) {
      if (value.resetAt <= now) memoryBuckets.delete(key);
    }
  }
  return {
    allowed: bucket.count <= input.limit,
    remaining: Math.max(0, input.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    provider: 'memory',
  };
}

