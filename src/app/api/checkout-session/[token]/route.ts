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
    const service = order.service as Service

    if (!service || typeof service === 'string') {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

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

        // Check if Stripe status is ahead of DB (webhook lag or missing webhook)
        // If so, update the DB as a fallback — don't rely solely on webhooks
        if (
          paymentIntent.status === 'succeeded' &&
          (effectiveStatus === 'pending' || effectiveStatus === 'failed')
        ) {
          effectiveStatus = 'paid'
          // Actually persist the status update to the database
          try {
            await payload.update({
              collection: 'orders',
              id: order.id,
              data: {
                status: 'paid',
              },
            })
            console.log(
              `[CHECKOUT-SESSION] Order ${order.id} updated to 'paid' (fallback — Stripe confirmed succeeded but DB was '${order.status}')`,
            )
          } catch (updateErr) {
            console.error('[CHECKOUT-SESSION] Failed to update order status:', updateErr)
            // Non-fatal: still return the correct status to the UI
          }
        }

        // Also sync canceled status from Stripe
        // NOTE: Do NOT treat 'requires_payment_method' as failed — that's the
        // normal initial state before the customer has paid
        if (paymentIntent.status === 'canceled' && effectiveStatus === 'pending') {
          effectiveStatus = 'failed'
          try {
            await payload.update({
              collection: 'orders',
              id: order.id,
              data: { status: 'failed' },
            })
            console.log(
              `[CHECKOUT-SESSION] Order ${order.id} updated to 'failed' (Stripe status: ${paymentIntent.status})`,
            )
          } catch (updateErr) {
            console.error('[CHECKOUT-SESSION] Failed to update order status:', updateErr)
          }
        }
      } catch (err) {
        console.error('Failed to retrieve payment intent:', err)
        return NextResponse.json({ error: 'Failed to retrieve payment session' }, { status: 500 })
      }
    }

    return NextResponse.json({
      clientSecret,
      orderId: order.id,
      checkoutToken: token,
      status: effectiveStatus,
      amount: order.total,
      quantity: order.quantity || 1,
      serviceName: service.title,
      serviceId: service.id,
      // Service data for the UI
      service: {
        id: service.id,
        title: service.title,
        description: service.description || '',
        price: order.total,
        slug: service.slug,
        icon: service.icon || undefined,
        priceUnit: service.priceUnit || undefined,
      },
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
