import type { NextResponse } from 'next/server'

/**
 * Security headers configuration for production
 * These headers help protect against common web vulnerabilities
 */
export const securityHeaders = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection in browsers
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Content Security Policy - adjust based on your needs
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'", // Required for styled-jsx
    "img-src 'self' blob: data: https://app-dev.dztech.shop https://app.dztech.shop  https://dev-s3-api.bitloader.shop",
    "font-src 'self'",
    "connect-src 'self' https://*.stripe.com",
    "frame-src 'self' https://*.stripe.com",
    "media-src 'self'",
  ].join('; '),

  // Strict Transport Security (HSTS) - only in production
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),

  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    }
  })
  return response
}

/**
 * Check if request has required security headers for API routes
 */
export function validateSecurityHeaders(request: Request): {
  valid: boolean
  error?: string
} {
  // Check for required headers
  const contentType = request.headers.get('content-type')

  // For POST/PUT/PATCH requests, ensure proper content-type
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (
      !contentType ||
      (!contentType.includes('application/json') &&
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('application/x-www-form-urlencoded'))
    ) {
      return { valid: false, error: 'Invalid content type' }
    }
  }

  return { valid: true }
}
