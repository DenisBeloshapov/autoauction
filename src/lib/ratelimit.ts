import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiter for auth endpoints.
 *
 * Production (Vercel): uses Upstash Redis — works across all serverless instances.
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 *
 * Local dev without Upstash: falls back to a simple in-memory limiter.
 * Per-instance only (not shared across invocations on serverless platforms).
 */

let limiter: Ratelimit | null = null
let memoryMap = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // 10 attempts per minute per IP

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '1 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  })
  console.log('[ratelimit] Using Upstash Redis')
} else {
  console.log('[ratelimit] UPSTASH_REDIS_REST_URL not set — using in-memory limiter (dev only)')
}

/**
 * Returns { success, limit, remaining, reset }.
 * Caller must check `success` and return 429 if false.
 */
export async function checkRateLimit(identifier: string): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  if (limiter) {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  // In-memory fallback
  const now = Date.now()
  const entry = memoryMap.get(identifier)
  if (!entry || now > entry.resetAt) {
    memoryMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return { success: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS - 1, reset: now + WINDOW_MS }
  }
  entry.count++
  if (entry.count > MAX_REQUESTS) {
    return { success: false, limit: MAX_REQUESTS, remaining: 0, reset: entry.resetAt }
  }
  return {
    success: true,
    limit: MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    reset: entry.resetAt,
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
