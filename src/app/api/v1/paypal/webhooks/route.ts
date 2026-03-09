import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

/**
 * PayPal Webhook Handler
 * Handles asynchronous PayPal events for order status updates
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const eventType = body.event_type

    console.log('[PayPal Webhook] Received event:', eventType)

    const payload = await getPayloadClient()

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = body.resource
        const customId = capture?.custom_id
        const paypalOrderId = capture?.supplementary_data?.related_ids?.order_id || capture?.id

        if (customId || paypalOrderId) {
          const orders = await payload.find({
            collection: 'orders',
            where: {
              or: [
                ...(customId ? [{ orderId: { equals: customId } }] : []),
                ...(paypalOrderId ? [{ paypalOrderId: { equals: paypalOrderId } }] : []),
              ],
            },
            limit: 1,
          })

          if (orders.docs.length > 0) {
            await payload.update({
              collection: 'orders',
              id: orders.docs[0].id,
              data: { status: 'paid' },
            })
            console.log('[PayPal Webhook] Order marked as paid:', orders.docs[0].orderId)
          }
        }
        break
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED': {
        const capture = body.resource
        const customId = capture?.custom_id

        if (customId) {
          const orders = await payload.find({
            collection: 'orders',
            where: { orderId: { equals: customId } },
            limit: 1,
          })

          if (orders.docs.length > 0) {
            await payload.update({
              collection: 'orders',
              id: orders.docs[0].id,
              data: { status: 'failed' },
            })
            console.log('[PayPal Webhook] Order marked as failed:', orders.docs[0].orderId)
          }
        }
        break
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const capture = body.resource
        const customId = capture?.custom_id

        if (customId) {
          const orders = await payload.find({
            collection: 'orders',
            where: { orderId: { equals: customId } },
            limit: 1,
          })

          if (orders.docs.length > 0) {
            await payload.update({
              collection: 'orders',
              id: orders.docs[0].id,
              data: { status: 'refunded' },
            })
            console.log('[PayPal Webhook] Order marked as refunded:', orders.docs[0].orderId)
          }
        }
        break
      }

      case 'CUSTOMER.DISPUTE.CREATED':
      case 'CUSTOMER.DISPUTE.UPDATED':
      case 'CUSTOMER.DISPUTE.RESOLVED': {
        const dispute = body.resource
        const transactions = dispute?.disputed_transactions || []

        for (const txn of transactions) {
          const customId = txn?.custom
          if (customId) {
            const orders = await payload.find({
              collection: 'orders',
              where: { orderId: { equals: customId } },
              limit: 1,
            })

            if (orders.docs.length > 0) {
              const isResolved = eventType === 'CUSTOMER.DISPUTE.RESOLVED'
              await payload.update({
                collection: 'orders',
                id: orders.docs[0].id,
                data: {
                  status: isResolved ? 'paid' : 'disputed',
                  disputeStatus: isResolved ? 'won' : 'needs_response',
                  disputeReason: dispute?.reason || 'paypal_dispute',
                },
              })
              console.log(`[PayPal Webhook] Order ${orders.docs[0].orderId} dispute: ${eventType}`)
            }
          }
        }
        break
      }

      default:
        console.log('[PayPal Webhook] Unhandled event type:', eventType)
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[PayPal Webhook] Error:', error)
    // Return 200 to prevent PayPal from retrying
    return NextResponse.json({ received: true })
  }
}
