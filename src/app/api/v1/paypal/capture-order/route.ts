import { NextResponse } from 'next/server'
import { getPayPalOrdersController, isPayPalConfigured } from '@/lib/paypal'
import { getPayloadClient } from '@/lib/payload'
import type { Provider, Service } from '@/payload-types'

export async function POST(request: Request) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json({ error: 'PayPal is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { paypalOrderId, orderId } = body

    if (!paypalOrderId) {
      return NextResponse.json({ error: 'paypalOrderId is required' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    // Find the order in our database
    // orderId may be a Payload document ID (ObjectId) or a client orderId (ORD-xxx)
    let order = null

    // First try by paypalOrderId (most reliable)
    const byPaypal = await payload.find({
      collection: 'orders',
      where: { paypalOrderId: { equals: paypalOrderId } },
      depth: 1,
      limit: 1,
    })
    if (byPaypal.docs.length > 0) {
      order = byPaypal.docs[0]
    }

    // If not found, try by document ID
    if (!order && orderId && /^[a-f\d]{24}$/i.test(orderId)) {
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

    // Finally try by orderId field (ORD-xxx)
    if (!order && orderId) {
      const byOrderId = await payload.find({
        collection: 'orders',
        where: { orderId: { equals: orderId } },
        depth: 1,
        limit: 1,
      })
      if (byOrderId.docs.length > 0) {
        order = byOrderId.docs[0]
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If already paid, return success
    if (order.status === 'paid') {
      return NextResponse.json({ status: 'already_paid', orderId: order.orderId })
    }

    // Capture the PayPal order
    const ordersController = getPayPalOrdersController()
    const captureResponse = await ordersController.captureOrder({
      id: paypalOrderId,
    })

    const capturedOrder = captureResponse.result

    if (capturedOrder.status === 'COMPLETED') {
      // Update order status to paid
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: 'paid',
          paypalOrderId,
        },
      })

      // Notify provider if applicable (with exponential backoff, matching Stripe webhook quality)
      const providerId =
        typeof order.provider === 'object' ? (order.provider as Provider)?.id : order.provider

      if (providerId) {
        try {
          const provider = await payload.findByID({
            collection: 'providers',
            id: providerId as string,
          })

          if (provider?.webhookUrl) {
            const service = order.service as Service
            const webhookPayload = {
              event: 'payment_succeeded',
              orderId: order.orderId || order.id,
              externalId: order.externalId || null,
              providerId: provider.id,
              providerName: provider.name,
              serviceId: service?.id || order.service,
              serviceName: service?.title || 'Unknown Service',
              amount: order.total,
              status: 'paid',
              paypalOrderId,
              paymentMethod: 'paypal',
              timestamp: new Date().toISOString(),
            }

            // Notify with exponential backoff retry (non-blocking)
            const notifyWithRetry = async () => {
              const maxRetries = 5
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  if (attempt > 1) {
                    const delay = Math.pow(2, attempt - 2) * 1000
                    await new Promise((resolve) => setTimeout(resolve, delay))
                  }
                  const response = await fetch(provider.webhookUrl!, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-DZTech-Webhook': 'payment-notification',
                    },
                    body: JSON.stringify(webhookPayload),
                  })
                  if (response.ok) {
                    console.log(
                      `[PayPal] Provider ${provider.name} notified successfully for order ${order.id}`,
                    )
                    return
                  }
                  console.warn(
                    `[PayPal] Failed to notify provider ${provider.name} (Attempt ${attempt}/${maxRetries}): ${response.status}`,
                  )
                } catch (err) {
                  console.error(
                    `[PayPal] Error notifying provider ${provider.name} (Attempt ${attempt}/${maxRetries}):`,
                    err,
                  )
                }
              }
              console.error(
                `[PayPal] Failed to notify provider ${provider.name} after ${maxRetries} attempts for order ${order.id}`,
              )
            }
            notifyWithRetry().catch(() => {})
          }
        } catch (err) {
          console.error('[PayPal] Error fetching provider for notification:', err)
        }
      }

      return NextResponse.json({
        status: 'success',
        orderId: order.orderId || order.id,
      })
    } else {
      // Payment not completed
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'failed' },
      })

      return NextResponse.json(
        { error: 'Payment was not completed', status: capturedOrder.status },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('[PayPal] Capture order error:', error)
    return NextResponse.json({ error: 'Failed to capture PayPal payment' }, { status: 500 })
  }
}
