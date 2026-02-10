import { getPayloadClient } from '@/lib/payload'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { isValidCheckoutToken } from '@/lib/checkout-token'
import type { Service, Provider } from '@/payload-types'

/**
 * GET /api/checkout-session/[token]
 *
 * Resolves a checkout token to the full checkout session data.
 * This is the secure replacement for exposing serviceId + orderId in the URL.
 *
 * Supports both service-based and provider-initiated (service-less) orders.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    // Validate token format first (fast fail)
    if (!token || !isValidCheckoutToken(token)) {
      return NextResponse.json({ error: 'Invalid checkout link' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    // Find order by checkout token
    const orders = await payload.find({
      collection: 'orders',
      where: {
        checkoutToken: { equals: token },
      },
      depth: 1, // Populate service and provider
      limit: 1,
    })

    if (orders.docs.length === 0) {
      return NextResponse.json({ error: 'Checkout session not found or expired' }, { status: 404 })
    }

    const order = orders.docs[0]

    // Service is optional — get it if it exists
    const service = order.service as Service | null
    const hasService = service && typeof service !== 'string'

    // Get provider info
    const provider = order.provider as Provider | null
    const providerName = provider && typeof provider !== 'string' ? provider.name : undefined
    const successRedirectUrl =
      provider && typeof provider !== 'string' ? provider.successRedirectUrl : undefined
    const cancelRedirectUrl =
      provider && typeof provider !== 'string' ? provider.cancelRedirectUrl : undefined

    // If order has a payment intent, retrieve the client secret
    let clientSecret: string | null = null
    let effectiveStatus = order.status

    if (order.stripePaymentIntentId) {
      try {
        const stripe = getStripe()
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)
        clientSecret = paymentIntent.client_secret

        // Check if Stripe status is ahead of DB (webhook lag)
        if (
          paymentIntent.status === 'succeeded' &&
          (effectiveStatus === 'pending' || effectiveStatus === 'failed')
        ) {
          effectiveStatus = 'paid'
        }
      } catch (err) {
        console.error('Failed to retrieve payment intent:', err)
        return NextResponse.json({ error: 'Failed to retrieve payment session' }, { status: 500 })
      }
    }

    // Build display name — use service title if available, otherwise order's itemName
    const displayName = hasService
      ? service.title
      : (order as typeof order & { itemName?: string }).itemName || 'Payment'

    const displayDescription = hasService
      ? service.description || ''
      : (order as typeof order & { itemDescription?: string }).itemDescription || ''

    return NextResponse.json({
      clientSecret,
      orderId: order.id,
      checkoutToken: token,
      status: effectiveStatus,
      amount: order.total,
      quantity: order.quantity || 1,
      // Display info — works for both service-based and provider orders
      serviceName: displayName,
      serviceId: hasService ? service.id : undefined,
      stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      // Service data for the UI (null for provider-initiated orders without a service)
      service: hasService
        ? {
            id: service.id,
            title: service.title,
            description: service.description || '',
            price: order.total,
            slug: service.slug,
            icon: service.icon || undefined,
            priceUnit: service.priceUnit || undefined,
          }
        : null,
      // Item info for provider-initiated orders
      item: !hasService
        ? {
            name: displayName,
            description: displayDescription,
            price: order.total,
          }
        : undefined,
      // Provider info
      ...(providerName && { provider: providerName }),
      ...(successRedirectUrl && { successRedirectUrl }),
      ...(cancelRedirectUrl && { cancelRedirectUrl }),
    })
  } catch (error) {
    console.error('Error resolving checkout token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
