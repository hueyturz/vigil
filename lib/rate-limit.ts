import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiting (audit C3/C4, battle plan session 7). Upstash Redis-backed
// sliding windows, usable from API routes and server actions.
//
// FAIL-OPEN by design: if UPSTASH_REDIS_REST_URL/TOKEN are unset (Redis DB not
// created yet) or Redis errors at runtime, requests are ALLOWED and we warn —
// a rate-limiter outage must never take down login for real users.

export type LimitName = 'login' | 'demo' | 'ai' | 'search' | 'onboarding'

const CONFIGS: Record<LimitName, { requests: number; window: `${number} ${'s' | 'm' | 'h' | 'd'}` }> = {
  login:      { requests: 5,  window: '15 m' },  // per IP
  demo:       { requests: 3,  window: '1 h'  },  // per IP
  ai:         { requests: 50, window: '1 d'  },  // per funeral home (Deepgram/Anthropic cost)
  search:     { requests: 60, window: '1 m'  },  // per user
  onboarding: { requests: 3,  window: '1 h'  },  // per IP
}

let redis: Redis | null | undefined // undefined = not yet resolved
let warned = false
const limiters = new Map<LimitName, Ratelimit>()

function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    redis = null
    return null
  }
  redis = new Redis({ url, token })
  return redis
}

function getLimiter(name: LimitName): Ratelimit | null {
  const client = getRedis()
  if (!client) return null
  let limiter = limiters.get(name)
  if (!limiter) {
    const cfg = CONFIGS[name]
    limiter = new Ratelimit({
      redis:    client,
      limiter:  Ratelimit.slidingWindow(cfg.requests, cfg.window),
      prefix:   `rl:${name}`,
    })
    limiters.set(name, limiter)
  }
  return limiter
}

export async function rateLimit(
  name: LimitName,
  identifier: string,
): Promise<{ success: boolean; remaining: number }> {
  const limiter = getLimiter(name)
  if (!limiter) {
    if (!warned) {
      warned = true
      console.warn('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is DISABLED (fail-open).')
    }
    return { success: true, remaining: -1 }
  }
  try {
    const result = await limiter.limit(identifier)
    return { success: result.success, remaining: result.remaining }
  } catch (err) {
    console.error('[rate-limit] Redis error (failing open):', err instanceof Error ? err.message : err)
    return { success: true, remaining: -1 }
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
