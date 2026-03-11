import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import type { Service, Provider } from '@/payload-types'

/**
 * POST /api/v1/initialize-payment
 *
 * Lazily creates a Stripe PaymentIntent for an existing order.
 * Called from the checkout page when the user selects Cash App.
 *
 * If the order already has a Stripe PaymentIntent, it retrieves and
 * returns the existing client secret (idempotent).
 *
 * Body: { orderId: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    // Look up the order (try document ID first, then orderId field)
    let order
    const isObjectId = /^[a-f\d]{24}$/i.test(orderId)

    if (isObjectId) {
      try {
        order = await payload.findByID({
          collection: 'orders',
          id: orderId,
          depth: 1,
        })
      } catch {
        // Not found by ID
      }
    }

    if (!order) {
      const results = await payload.find({
        collection: 'orders',
        where: { orderId: { equals: orderId } },
        depth: 1,
        limit: 1,
      })
      if (results.docs.length > 0) {
        order = results.docs[0]
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If order already has a Stripe PI, return the existing client secret
    if (order.stripePaymentIntentId) {
      const stripe = getStripe()
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)
        return NextResponse.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        })
      } catch (err) {
        console.error('[INIT-PAYMENT] Failed to retrieve existing PI:', err)
        // Fall through to create a new one
      }
    }

    const service = order.service as Service
    if (!service || typeof service === 'string') {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const provider = order.provider as Provider | null
    const providerId = provider && typeof provider !== 'string' ? provider.id : undefined
    const externalId = order.externalId || undefined

    // Build idempotency key
    const idempotencyKey = externalId
      ? `pi_${service.id}_${externalId}_${order.total}`
      : `pi_${service.id}_${order.id}_${order.total}`

    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(order.total * 100),
        currency: 'usd',
        payment_method_types: ['cashapp'],
        description: service.title,
        metadata: {
          serviceId: service.id,
          ...(providerId && { providerId }),
          ...(externalId && { externalId }),
        },
      },
      { idempotencyKey },
    )

    // Store the PI on the order
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentMethod: 'cashapp',
      },
      overrideAccess: true,
    })

    console.log(`[INIT-PAYMENT] Created Stripe PI ${paymentIntent.id} for order ${order.id}`)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: unknown) {
    console.error('[INIT-PAYMENT] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (
      errorMessage.includes('cashapp') ||
      errorMessage.includes('payment_method_types') ||
      errorMessage.includes('not available')
    ) {
      return NextResponse.json(
        { error: 'Cash App payments are not available for this service' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: 'Failed to initialize payment', details: errorMessage },
      { status: 500 },
    )
  }
}
