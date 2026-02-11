import { getPayloadClient } from '@/lib/payload'
import type { Order, Provider, Service } from '@/payload-types'

/**
 * Notify a provider about a payment status change via their webhook URL
 * Implements exponential backoff retry mechanism
 * Max retries: 5 (approx 30s total wait time)
 */
async function notifyProvider(
  provider: Provider,
  order: Order,
  event: 'payment_succeeded' | 'payment_failed',
) {
  if (!provider.webhookUrl) {
    return // Provider has no webhook URL configured
  }

  const maxRetries = 5
  let attempt = 0
  let success = false

  const service = order.service as Service
  const webhookPayload = {
    event,
    // Use Payload's auto-generated id
    orderId: order.id,
    // Include provider's external ID for their own tracking
    externalId: order.externalId || null,
    providerId: provider.id,
    providerName: provider.name,
    serviceId: service?.id || order.service,
    serviceName: service?.title || 'Unknown Service',
    amount: order.total,
    status: order.status,
    stripePaymentIntentId: order.stripePaymentIntentId,
    timestamp: new Date().toISOString(),
  }

  while (attempt < maxRetries && !success) {
    try {
      attempt++

      // Calculate delay with exponential backoff if this is a retry
      // Attempt 1: 0ms (immediate)
      // Attempt 2: 1000ms
      // Attempt 3: 2000ms
      // Attempt 4: 4000ms
      // Attempt 5: 8000ms
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 2) * 1000
        console.log(
          `Retry attempt ${attempt}/${maxRetries} for provider ${provider.name} in ${delay}ms...`,
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
        console.log(`Provider ${provider.name} notified successfully for order ${order.id}`)
        success = true
      } else {
        console.warn(
          `Failed to notify provider ${provider.name} (Attempt ${attempt}/${maxRetries}): ${response.status} ${response.statusText}`,
        )
      }
    } catch (error) {
      console.error(
        `Error notifying provider ${provider.name} (Attempt ${attempt}/${maxRetries}):`,
        error,
      )
    }
  }

  if (!success) {
    console.error(
      `Failed to notify provider ${provider.name} after ${maxRetries} attempts for order ${order.id}`,
    )
    // TODO: Ideally we should log this to a failed_webhooks collection for manual replay
  }
}

// Handle successful PaymentIntent (for Cash App and other direct payment methods)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paymentIntentSucceeded = async ({ event }: any) => {
  const paymentIntent = event.data.object
  const { serviceId, providerId, externalId } = paymentIntent.metadata || {}

  console.log('[WEBHOOK:SUCCESS] Processing payment_intent.succeeded')
  console.log('[WEBHOOK:SUCCESS] PaymentIntent ID:', paymentIntent.id)
  console.log('[WEBHOOK:SUCCESS] Amount:', paymentIntent.amount, 'cents')
  console.log(
    '[WEBHOOK:SUCCESS] Metadata - serviceId:',
    serviceId,
    'providerId:',
    providerId,
    'externalId:',
    externalId,
  )

  const payload = await getPayloadClient()
  console.log('[WEBHOOK:SUCCESS] Payload client obtained')

  try {
    // Find order by payment intent ID
    console.log(
      '[WEBHOOK:SUCCESS] Searching for order with stripePaymentIntentId:',
      paymentIntent.id,
    )
    const existingOrders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntent.id },
      },
      depth: 1, // Populate provider and service
    })

    console.log('[WEBHOOK:SUCCESS] Found', existingOrders.docs.length, 'matching orders')

    let order: Order | null = null

    if (existingOrders.docs.length > 0) {
      const existingOrder = existingOrders.docs[0]
      console.log(
        '[WEBHOOK:SUCCESS] Existing order found:',
        existingOrder.id,
        'current status:',
        existingOrder.status,
      )

      // Update existing order to paid
      const updatedOrder = await payload.update({
        collection: 'orders',
        id: existingOrder.id,
        data: {
          status: 'paid',
        },
      })
      console.log(
        '[WEBHOOK:SUCCESS] ✅ Order',
        existingOrder.id,
        'updated to status:',
        updatedOrder.status,
      )

      order = { ...existingOrder, status: 'paid' }
    } else if (serviceId) {
      console.log(
        '[WEBHOOK:SUCCESS] No existing order found, creating new order for serviceId:',
        serviceId,
      )
      // Create new order if it doesn't exist
      const newOrder = await payload.create({
        collection: 'orders',
        data: {
          service: serviceId,
          status: 'paid',
          total: paymentIntent.amount / 100,
          stripePaymentIntentId: paymentIntent.id,
          ...(providerId && { provider: providerId }),
          ...(externalId && { externalId }),
        },
      })
      console.log('[WEBHOOK:SUCCESS] ✅ New order created:', newOrder.id)

      order = newOrder
    } else {
      console.warn(
        '[WEBHOOK:SUCCESS] ⚠️ No order found AND no serviceId in metadata - cannot process this event',
      )
    }

    // Notify provider if applicable
    if (order && providerId) {
      console.log('[WEBHOOK:SUCCESS] Notifying provider:', providerId)
      try {
        const provider = await payload.findByID({
          collection: 'providers',
          id: providerId,
        })
        if (provider && provider.webhookUrl) {
          await notifyProvider(provider, order, 'payment_succeeded')
        } else {
          console.log('[WEBHOOK:SUCCESS] Provider has no webhookUrl configured')
        }
      } catch (err) {
        console.error('[WEBHOOK:SUCCESS] Error fetching provider for notification:', err)
      }
    }
  } catch (error) {
    console.error('[WEBHOOK:SUCCESS] ❌ Error updating order from PaymentIntent:', error)
  }
}

// Handle payment failed events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paymentIntentFailed = async ({ event }: any) => {
  const paymentIntent = event.data.object
  const { providerId } = paymentIntent.metadata || {}

  console.log('[WEBHOOK:FAILED] Processing payment_intent.payment_failed')
  console.log('[WEBHOOK:FAILED] PaymentIntent ID:', paymentIntent.id)

  const payload = await getPayloadClient()

  try {
    // Find order by payment intent ID
    console.log(
      '[WEBHOOK:FAILED] Searching for order with stripePaymentIntentId:',
      paymentIntent.id,
    )
    const existingOrders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntent.id },
      },
      depth: 1, // Populate provider and service
    })

    console.log('[WEBHOOK:FAILED] Found', existingOrders.docs.length, 'matching orders')

    if (existingOrders.docs.length > 0) {
      const existingOrder = existingOrders.docs[0]
      console.log(
        '[WEBHOOK:FAILED] Updating order',
        existingOrder.id,
        'from status:',
        existingOrder.status,
        'to: failed',
      )

      await payload.update({
        collection: 'orders',
        id: existingOrder.id,
        data: {
          status: 'failed',
        },
      })
      console.log('[WEBHOOK:FAILED] ✅ Order', existingOrder.id, 'marked as failed')

      // Notify provider if applicable
      if (providerId) {
        try {
          const provider = await payload.findByID({
            collection: 'providers',
            id: providerId,
          })
          if (provider && provider.webhookUrl) {
            await notifyProvider(provider, { ...existingOrder, status: 'failed' }, 'payment_failed')
          }
        } catch (err) {
          console.error('[WEBHOOK:FAILED] Error fetching provider for notification:', err)
        }
      }
    } else {
      console.warn('[WEBHOOK:FAILED] ⚠️ No order found for PaymentIntent:', paymentIntent.id)
    }
  } catch (error) {
    console.error('[WEBHOOK:FAILED] ❌ Error updating failed order:', error)
  }
}

// Helper function to update order dispute status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateOrderDisputeStatus(dispute: any) {
  const payload = await getPayloadClient()
  const paymentIntentId = dispute.payment_intent as string

  console.log('[WEBHOOK:DISPUTE] Processing dispute:', dispute.id)
  console.log('[WEBHOOK:DISPUTE] Stripe dispute status:', dispute.status)
  console.log('[WEBHOOK:DISPUTE] Reason:', dispute.reason)
  console.log('[WEBHOOK:DISPUTE] Amount:', dispute.amount, 'cents')

  try {
    // Find order by payment intent ID
    const existingOrders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntentId },
      },
      limit: 1,
      depth: 1,
    })

    if (existingOrders.docs.length > 0) {
      const order = existingOrders.docs[0]

      // Map Stripe dispute status to our status options
      const statusMap: Record<string, string> = {
        warning_needs_response: 'warning_needs_response',
        warning_under_review: 'warning_under_review',
        warning_closed: 'warning_closed',
        needs_response: 'needs_response',
        under_review: 'under_review',
        won: 'won',
        lost: 'lost',
      }

      const disputeStatus = statusMap[dispute.status] || dispute.status

      // Determine the correct order status based on dispute outcome
      let orderStatus: 'disputed' | 'paid' | 'refunded' = 'disputed'
      if (dispute.status === 'won') {
        // Merchant won the dispute — money stays, order goes back to paid
        orderStatus = 'paid'
      } else if (dispute.status === 'lost') {
        // Customer won the dispute — money returned, order becomes refunded
        orderStatus = 'refunded'
      }

      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: orderStatus,
          disputeId: dispute.id,
          disputeStatus: disputeStatus,
          disputeAmount: dispute.amount / 100, // Convert cents to dollars
          disputeReason: dispute.reason,
        },
      })

      console.log(
        `[WEBHOOK:DISPUTE] ✅ Order ${order.id} updated — status: ${orderStatus}, disputeStatus: ${disputeStatus}`,
      )

      // Notify provider about dispute if applicable
      const provider = order.provider
      if (provider && typeof provider !== 'string' && provider.webhookUrl) {
        try {
          await notifyProvider(
            provider,
            { ...order, status: orderStatus, disputeStatus, disputeReason: dispute.reason },
            orderStatus === 'refunded' ? 'payment_failed' : 'payment_succeeded',
          )
          console.log('[WEBHOOK:DISPUTE] Provider notified about dispute outcome')
        } catch (err) {
          console.error('[WEBHOOK:DISPUTE] Error notifying provider:', err)
        }
      }
    } else {
      console.warn(`[WEBHOOK:DISPUTE] ⚠️ No order found for payment intent: ${paymentIntentId}`)
    }
  } catch (error) {
    console.error('[WEBHOOK:DISPUTE] ❌ Error updating order dispute status:', error)
  }
}

// Handle dispute created
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleDisputeCreated = async ({ event }: any) => {
  const dispute = event.data.object
  console.log(`Dispute created: ${dispute.id}`)
  await updateOrderDisputeStatus(dispute)
}

// Handle dispute updated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleDisputeUpdated = async ({ event }: any) => {
  const dispute = event.data.object
  console.log(`Dispute updated: ${dispute.id} for status: ${dispute.status}`)
  await updateOrderDisputeStatus(dispute)
}

// Handle dispute closed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleDisputeClosed = async ({ event }: any) => {
  const dispute = event.data.object
  console.log(`Dispute closed: ${dispute.id} with status: ${dispute.status}`)
  await updateOrderDisputeStatus(dispute)
}
