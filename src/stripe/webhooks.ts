import { getPayloadClient } from '@/lib/payload'
import { generateOrderId } from '@/lib/order-generator'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkoutSessionCompleted = async ({ event }: any) => {
  const session = event.data.object
  const { serviceId, orderId: metadataOrderId } = session.metadata || {}

  // Use orderId from metadata, or client_reference_id, or generate new one
  const orderId = metadataOrderId || session.client_reference_id || generateOrderId()

  if (serviceId) {
    const payload = await getPayloadClient()

    try {
      // Check if order already exists
      const existingOrders = await payload.find({
        collection: 'orders',
        where: {
          orderId: { equals: orderId },
        },
      })

      if (existingOrders.docs.length > 0) {
        // Update existing order
        await payload.update({
          collection: 'orders',
          id: existingOrders.docs[0].id,
          data: {
            status: 'paid',
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            customerEmail: session.customer_details?.email || undefined,
          },
        })
        console.log(`Order ${orderId} updated to paid status`)
      } else {
        // Create new order
        await payload.create({
          collection: 'orders',
          data: {
            orderId,
            service: serviceId,
            status: 'paid',
            total: session.amount_total / 100,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            customerEmail: session.customer_details?.email || undefined,
          },
        })
        console.log(`Order ${orderId} created for session ${session.id}`)
      }
    } catch (error) {
      console.error('Error creating/updating order:', error)
    }
  }
}

// Handle successful PaymentIntent (for Cash App and other direct payment methods)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paymentIntentSucceeded = async ({ event }: any) => {
  const paymentIntent = event.data.object
  const { orderId, serviceId } = paymentIntent.metadata || {}

  if (orderId) {
    const payload = await getPayloadClient()

    try {
      const existingOrders = await payload.find({
        collection: 'orders',
        where: {
          orderId: { equals: orderId },
        },
      })

      if (existingOrders.docs.length > 0) {
        // Update existing order to paid
        await payload.update({
          collection: 'orders',
          id: existingOrders.docs[0].id,
          data: {
            status: 'paid',
            stripePaymentIntentId: paymentIntent.id,
          },
        })
        console.log(`Order ${orderId} marked as paid via PaymentIntent`)
      } else if (serviceId) {
        // Create new order if it doesn't exist
        await payload.create({
          collection: 'orders',
          data: {
            orderId,
            service: serviceId,
            status: 'paid',
            total: paymentIntent.amount / 100,
            stripePaymentIntentId: paymentIntent.id,
          },
        })
        console.log(`Order ${orderId} created for PaymentIntent ${paymentIntent.id}`)
      }
    } catch (error) {
      console.error('Error updating order from PaymentIntent:', error)
    }
  }
}

// Handle payment failed events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paymentIntentFailed = async ({ event }: any) => {
  const paymentIntent = event.data.object
  const { orderId } = paymentIntent.metadata || {}

  if (orderId) {
    const payload = await getPayloadClient()

    try {
      const existingOrders = await payload.find({
        collection: 'orders',
        where: {
          orderId: { equals: orderId },
        },
      })

      if (existingOrders.docs.length > 0) {
        await payload.update({
          collection: 'orders',
          id: existingOrders.docs[0].id,
          data: {
            status: 'failed',
          },
        })
        console.log(`Order ${orderId} marked as failed`)
      }
    } catch (error) {
      console.error('Error updating failed order:', error)
    }
  }
}
