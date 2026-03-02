import type { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Simple in-memory rate limiter
// For production with multiple instances, use Redis instead
const rateLimitMap = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Check for real IP header
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fall back to IP from socket (may be internal IP in containerized environments)
  // Note: In Next.js, request.ip is available in some environments but not typed
  return (request as NextRequest & { ip?: string }).ip || 'unknown'
}

/**
 * Check if request should be rate limited
 * Returns null if allowed, or retry-after seconds if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  options: Partial<RateLimitOptions> = {},
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const identifier = getClientIP(request)
  const key = `${identifier}:${request.nextUrl.pathname}`
  const now = Date.now()

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up on each request
    cleanupExpiredEntries(now)
  }

  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment count
  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

/**
 * Stricter rate limits for authentication endpoints
 */
export function checkAuthRateLimit(request: NextRequest): {
  allowed: boolean
  retryAfter?: number
} {
  return checkRateLimit(request, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 login attempts per hour
  })
}

/**
 * Rate limits for API endpoints
 */
export function checkAPIRateLimit(request: NextRequest): {
  allowed: boolean
  retryAfter?: number
  remaining?: number
} {
  return checkRateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  })
}

/**
 * Rate limits for checkout/payment endpoints
 */
export function checkPaymentRateLimit(request: NextRequest): {
  allowed: boolean
  retryAfter?: number
  remaining?: number
} {
  return checkRateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  })
}
