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

  const payload = await getPayloadClient()

  try {
    // Find order by payment intent ID
    const existingOrders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntent.id },
      },
      depth: 1, // Populate provider and service
    })

    let order: Order | null = null

    if (existingOrders.docs.length > 0) {
      const existingOrder = existingOrders.docs[0]

      // Update existing order to paid
      await payload.update({
        collection: 'orders',
        id: existingOrder.id,
        data: {
          status: 'paid',
        },
      })
      console.log(`Order ${existingOrder.id} marked as paid via PaymentIntent`)

      order = { ...existingOrder, status: 'paid' }
    } else if (serviceId) {
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
      console.log(`Order ${newOrder.id} created for PaymentIntent ${paymentIntent.id}`)

      order = newOrder
    }

    // Notify provider if applicable
    if (order && providerId) {
      // Fetch provider to get webhook URL
      try {
        const provider = await payload.findByID({
          collection: 'providers',
          id: providerId,
        })
        if (provider && provider.webhookUrl) {
          await notifyProvider(provider, order, 'payment_succeeded')
        }
      } catch (err) {
        console.error('Error fetching provider for notification:', err)
      }
    }
  } catch (error) {
    console.error('Error updating order from PaymentIntent:', error)
  }
}

// Handle payment failed events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paymentIntentFailed = async ({ event }: any) => {
  const paymentIntent = event.data.object
  const { providerId } = paymentIntent.metadata || {}

  const payload = await getPayloadClient()

  try {
    // Find order by payment intent ID
    const existingOrders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntent.id },
      },
      depth: 1, // Populate provider and service
    })

    if (existingOrders.docs.length > 0) {
      const existingOrder = existingOrders.docs[0]

      await payload.update({
        collection: 'orders',
        id: existingOrder.id,
        data: {
          status: 'failed',
        },
      })
      console.log(`Order ${existingOrder.id} marked as failed`)

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
          console.error('Error fetching provider for notification:', err)
        }
      }
    }
  } catch (error) {
    console.error('Error updating failed order:', error)
  }
}

// Helper function to update order dispute status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateOrderDisputeStatus(dispute: any) {
  const payload = await getPayloadClient()
  const paymentIntentId = dispute.payment_intent as string

  try {
    // Find order by payment intent ID
    const existingOrders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntentId },
      },
      limit: 1,
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

      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: 'disputed', // Update main status to disputed
          disputeId: dispute.id,
          disputeStatus: disputeStatus,
          disputeAmount: dispute.amount / 100, // Convert cents to dollars
          disputeReason: dispute.reason,
        },
      })
      console.log(`Order ${order.id} updated with dispute status: ${disputeStatus}`)
    } else {
      console.warn(`No order found for disputed payment intent: ${paymentIntentId}`)
    }
  } catch (error) {
    console.error('Error updating order dispute status:', error)
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
