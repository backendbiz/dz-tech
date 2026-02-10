import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const referer = request.headers.get('referer') || ''

  // Define domains
  // Clean hostname to remove port for comparison logic if needed, but let's handle full host string
  const isLocal = hostname.includes('localhost')

  const checkoutDomainHost = process.env.CHECKOUT_DOMAIN || 'app.dztech.shop'

  const checkoutDomain = isLocal
    ? `app.localhost:${request.nextUrl.port || 3000}`
    : checkoutDomainHost

  // 1. Bitloader Redirect: Accessing from bitloader should open app.dztech.shop
  // We check if referer contains bitloader and we are not already on the checkout domain
  if (referer.includes('bitloader') && hostname !== checkoutDomain) {
    const checkoutUrl = new URL('/checkout', request.url)
    checkoutUrl.host = checkoutDomain
    checkoutUrl.protocol = request.nextUrl.protocol
    checkoutUrl.port = request.nextUrl.port // Maintain port in dev
    return NextResponse.redirect(checkoutUrl)
  }

  // 2. Checkout Domain Handling (app.dztech.shop)
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
  }

  // 3. New Main Domain (new.dztech.shop)
  // Maps to standard routes automatically.

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - admin (PayloadCMS admin)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|admin).*)',
  ],
}
