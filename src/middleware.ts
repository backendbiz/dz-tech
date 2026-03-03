import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkAPIRateLimit, checkAuthRateLimit, checkPaymentRateLimit } from '@/lib/rate-limit'
import { applySecurityHeaders, validateSecurityHeaders } from '@/lib/security-headers'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const referer = request.headers.get('referer') || ''

  // Apply security headers validation for API routes
  if (url.pathname.startsWith('/api/')) {
    // Validate security headers
    const securityCheck = validateSecurityHeaders(request)
    if (!securityCheck.valid) {
      return new NextResponse(JSON.stringify({ error: securityCheck.error || 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Apply rate limiting based on route type
    let rateLimitCheck
    if (url.pathname.includes('/api/users/')) {
      rateLimitCheck = checkAuthRateLimit(request)
    } else if (url.pathname.includes('/api/orders') || url.pathname.includes('/checkout')) {
      rateLimitCheck = checkPaymentRateLimit(request)
    } else {
      rateLimitCheck = checkAPIRateLimit(request)
    }

    if (!rateLimitCheck.allowed) {
      const response = new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: rateLimitCheck.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitCheck.retryAfter || 60),
          },
        },
      )
      return applySecurityHeaders(response)
    }
  }

  // Define domains
  // Clean hostname to remove port for comparison logic if needed, but let's handle full host string
  const isLocal = hostname.includes('localhost')

  const checkoutDomainHost = process.env.CHECKOUT_DOMAIN || 'checkout.dztech.shop'

  const checkoutDomain = isLocal
    ? `checkout.localhost:${request.nextUrl.port || 3000}`
    : checkoutDomainHost

  // 1. Bitloader Redirect: Accessing from bitloader should open checkout.dztech.shop
  // We check if referer contains bitloader and we are not already on the checkout domain
  if (referer.includes('bitloader') && hostname !== checkoutDomain) {
    const checkoutUrl = new URL('/checkout', request.url)
    checkoutUrl.host = checkoutDomain
    checkoutUrl.protocol = request.nextUrl.protocol
    checkoutUrl.port = request.nextUrl.port // Maintain port in dev
    return NextResponse.redirect(checkoutUrl)
  }

  // 2. Checkout Domain Handling (checkout.dztech.shop)
  // If we are on the checkout domain
  if (hostname === checkoutDomain) {
    // Handle token-based checkout URLs: /checkout/o/[token]
    if (url.pathname.startsWith('/checkout/o/')) {
      // Let Next.js handle the dynamic route directly
      return NextResponse.next()
    }
    // Rewrite path /checkout to the implementation at /payment-standalone
    if (url.pathname === '/checkout') {
      return NextResponse.rewrite(new URL('/payment-standalone', request.url))
    }
    // If path is root, redirect to /checkout
    if (url.pathname === '/') {
      return NextResponse.redirect(new URL('/checkout', request.url))
    }
    // If request attempts to access /payment-standalone directly, let it pass (or you could redirect to /checkout for cleanliness)

    // Prevent access to other pages like /services, /about etc on checkout subdomain
    // But allow API routes and internal Next.js paths
    if (!url.pathname.startsWith('/_next') && !url.pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/checkout', request.url))
    }
  }

  // 3. New Main Domain (checkout.dztech.shop)
  // Maps to standard routes automatically.

  const response = NextResponse.next()

  // Apply security headers to all responses
  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Keep api and admin routes for security header/rate limit processing
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
