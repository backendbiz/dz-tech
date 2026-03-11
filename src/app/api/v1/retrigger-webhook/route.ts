import { getPayloadClient } from '@/lib/payload'
import { getStripe } from '@/lib/stripe'
import { getPayPalOrdersController, isPayPalConfigured } from '@/lib/paypal'
import { isValidApiKeyFormat } from '@/lib/api-key'
import { NextResponse } from 'next/server'
import type { Provider, Service } from '@/payload-types'

/**
 * POST /api/v1/retrigger-webhook
 *
 * Re-checks the payment status from Stripe or PayPal and re-sends the
 * webhook notification to the provider if the payment has been completed.
 *
 * Body: { apiKey: string, externalId: string }
 *
 * - externalId = the provider's (biz-full's) own order ID, stored on
 *   the dz-tech order as `externalId`.
 * - apiKey = the provider's API key for authentication.
 *
 * Flow:
 *   1. Authenticate the provider via apiKey
 *   2. Find the dz-tech order by externalId + provider
 *   3. For Stripe (cashapp): retrieve the PaymentIntent from Stripe API
 *   4. For PayPal: retrieve the PayPal order from PayPal API
 *   5. If paid, update the dz-tech order status and re-fire notifyProvider()
 *   6. Return the current status to the caller
 */

async function notifyProvider(
  provider: Provider,
  order: {
    id: string
    externalId?: string | null
    service: Service | string
    total: number
    status: string
    stripePaymentIntentId?: string | null
    paypalOrderId?: string | null
    paymentMethod?: string | null
  },
  event: 'payment_succeeded' | 'payment_failed',
) {
  if (!provider.webhookUrl) {
    console.log(`[RETRIGGER] Provider ${provider.name} has no webhookUrl — skipping notification`)
    return false
  }

  const service = order.service as Service
  const paymentMethodType =
    order.paymentMethod === 'paypal' ? ('paypal' as const) : ('cashapp_stripe' as const)

  const webhookPayload = {
    event,
    orderId: order.id,
    externalId: order.externalId || null,
    providerId: provider.id,
    providerName: provider.name,
    serviceId: service?.id || order.service,
    serviceName: service?.title || 'Unknown Service',
    amount: order.total,
    status: order.status,
    ...(order.stripePaymentIntentId && { stripePaymentIntentId: order.stripePaymentIntentId }),
    ...(order.paypalOrderId && { paypalOrderId: order.paypalOrderId }),
    paymentMethodType,
    timestamp: new Date().toISOString(),
  }

  const maxRetries = 5
  let attempt = 0
  let success = false

  while (attempt < maxRetries && !success) {
    try {
      attempt++
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 2) * 1000
        console.log(
          `[RETRIGGER] Retry attempt ${attempt}/${maxRetries} for provider ${provider.name} in ${delay}ms...`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      const response = await fetch(provider.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DZTech-Webhook': 'payment-notification',
        },
        body: JSON.stringify(webhookPayload),
      })

      if (response.ok) {
        console.log(
          `[RETRIGGER] Provider ${provider.name} notified successfully for order ${order.id}`,
        )
        success = true
      } else {
        console.warn(
          `[RETRIGGER] Failed to notify provider ${provider.name} (Attempt ${attempt}/${maxRetries}): ${response.status} ${response.statusText}`,
        )
      }
    } catch (error) {
      console.error(
        `[RETRIGGER] Error notifying provider ${provider.name} (Attempt ${attempt}/${maxRetries}):`,
        error,
      )
    }
  }

  return success
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { apiKey, externalId } = body

    // --- Validate input ---
    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
    }
    if (!externalId) {
      return NextResponse.json({ error: 'externalId is required' }, { status: 400 })
    }
    if (!isValidApiKeyFormat(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
    }

    const payload = await getPayloadClient()

    // --- Authenticate provider ---
    const providerResult = await payload.find({
      collection: 'providers',
      where: {
        apiKey: { equals: apiKey },
        status: { equals: 'active' },
      },
      limit: 1,
      depth: 1,
    })

    if (providerResult.docs.length === 0) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const provider = providerResult.docs[0]
    console.log(`[RETRIGGER] Provider "${provider.name}" authenticated`)

    // --- Find the order by externalId + provider ---
    const orderResult = await payload.find({
      collection: 'orders',
      where: {
        and: [
          { externalId: { equals: externalId } },
          { provider: { equals: provider.id } },
        ],
      },
      depth: 1,
      limit: 1,
    })

    if (orderResult.docs.length === 0) {
      return NextResponse.json(
        { error: `Order with externalId "${externalId}" not found for this provider` },
        { status: 404 },
      )
    }

    const order = orderResult.docs[0]
    console.log(
      `[RETRIGGER] Found order ${order.id}, status: ${order.status}, paymentMethod: ${order.paymentMethod}`,
    )

    // --- If already paid, just re-fire the webhook ---
    if (order.status === 'paid') {
      console.log(`[RETRIGGER] Order ${order.id} is already paid — re-sending webhook`)
      const notified = await notifyProvider(provider, order, 'payment_succeeded')
      return NextResponse.json({
        status: 'paid',
        message: 'Order is already paid. Webhook re-sent.',
        webhookDelivered: notified,
      })
    }

    // --- If failed/refunded/disputed, return the current status ---
    if (['refunded', 'disputed'].includes(order.status)) {
      return NextResponse.json({
        status: order.status,
        message: `Order is ${order.status}. Cannot retrigger.`,
      })
    }

    // --- Check the actual payment status from the payment processor ---
    let actualStatus: 'paid' | 'pending' | 'failed' = 'pending'
    let statusDetail = ''

    if (order.paymentMethod === 'paypal' && order.paypalOrderId) {
      // --- PayPal: check the order status ---
      try {
        if (!isPayPalConfigured()) {
          return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
        }

        const ordersController = getPayPalOrdersController()
        const paypalOrder = await ordersController.getOrder({ id: order.paypalOrderId })
        const paypalStatus = paypalOrder.result.status

        console.log(
          `[RETRIGGER] PayPal order ${order.paypalOrderId} status: ${paypalStatus}`,
        )

        // PayPal order statuses:
        // CREATED, SAVED, APPROVED, VOIDED, COMPLETED, PAYER_ACTION_REQUIRED
        if (paypalStatus === 'COMPLETED') {
          actualStatus = 'paid'
          statusDetail = `PayPal order ${order.paypalOrderId} is COMPLETED`
        } else if (paypalStatus === 'VOIDED') {
          actualStatus = 'failed'
          statusDetail = `PayPal order ${order.paypalOrderId} is VOIDED`
        } else {
          actualStatus = 'pending'
          statusDetail = `PayPal order ${order.paypalOrderId} is ${paypalStatus}`
        }
      } catch (err) {
        console.error(`[RETRIGGER] Error checking PayPal order:`, err)
        return NextResponse.json(
          { error: 'Failed to check PayPal payment status' },
          { status: 502 },
        )
      }
    } else if (order.stripePaymentIntentId) {
      // --- Stripe (Cash App): check the PaymentIntent ---
      try {
        const stripe = getStripe()
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)

        console.log(
          `[RETRIGGER] Stripe PaymentIntent ${order.stripePaymentIntentId} status: ${paymentIntent.status}`,
        )

        // Stripe PaymentIntent statuses:
        // requires_payment_method, requires_confirmation, requires_action,
        // processing, requires_capture, canceled, succeeded
        if (paymentIntent.status === 'succeeded') {
          actualStatus = 'paid'
          statusDetail = `Stripe PaymentIntent ${order.stripePaymentIntentId} succeeded`
        } else if (paymentIntent.status === 'canceled') {
          actualStatus = 'failed'
          statusDetail = `Stripe PaymentIntent ${order.stripePaymentIntentId} canceled`
        } else {
          actualStatus = 'pending'
          statusDetail = `Stripe PaymentIntent ${order.stripePaymentIntentId} is ${paymentIntent.status}`
        }
      } catch (err) {
        console.error(`[RETRIGGER] Error checking Stripe PaymentIntent:`, err)
        return NextResponse.json(
          { error: 'Failed to check Stripe payment status' },
          { status: 502 },
        )
      }
    } else {
      // No payment processor reference — payment was never initiated by the customer
      return NextResponse.json({
        status: 'pending',
        message:
          'No payment has been initiated yet (no Stripe PaymentIntent or PayPal order). Customer may not have completed checkout.',
      })
    }

    // --- Update the dz-tech order if status changed ---
    if (actualStatus === 'paid') {
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'paid' },
        overrideAccess: true,
      })
      console.log(`[RETRIGGER] Order ${order.id} updated to 'paid'`)

      // Re-fire the webhook to the provider
      const notified = await notifyProvider(
        provider,
        { ...order, status: 'paid' },
        'payment_succeeded',
      )

      return NextResponse.json({
        status: 'paid',
        message: `Payment confirmed as paid. ${statusDetail}. Webhook re-sent.`,
        webhookDelivered: notified,
      })
    }

    if (actualStatus === 'failed') {
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'failed' },
        overrideAccess: true,
      })
      console.log(`[RETRIGGER] Order ${order.id} updated to 'failed'`)

      const notified = await notifyProvider(
        provider,
        { ...order, status: 'failed' },
        'payment_failed',
      )

      return NextResponse.json({
        status: 'failed',
        message: `Payment confirmed as failed. ${statusDetail}. Webhook re-sent.`,
        webhookDelivered: notified,
      })
    }

    // Still pending
    return NextResponse.json({
      status: 'pending',
      message: `Payment is still pending. ${statusDetail}`,
    })
  } catch (error: unknown) {
    console.error('[RETRIGGER] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to retrigger webhook', details: errorMessage },
      { status: 500 },
    )
  }
}
