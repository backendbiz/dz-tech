import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

const VALID_METHODS = ['cashapp', 'paypal'] as const
type PaymentMethod = (typeof VALID_METHODS)[number]

/**
 * POST /api/v1/select-payment-method
 *
 * Persists the user's payment method choice on an order.
 * Called from the checkout page when the user picks a payment method.
 *
 * Body: { orderId: string, paymentMethod: 'cashapp' | 'paypal' }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, paymentMethod } = body

    if (!orderId || !paymentMethod) {
      return NextResponse.json({ error: 'orderId and paymentMethod are required' }, { status: 400 })
    }

    if (!VALID_METHODS.includes(paymentMethod as PaymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method. Must be one of: ${VALID_METHODS.join(', ')}` },
        { status: 400 },
      )
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
          depth: 0,
        })
      } catch {
        // Not found by ID
      }
    }

    if (!order) {
      const results = await payload.find({
        collection: 'orders',
        where: { orderId: { equals: orderId } },
        depth: 0,
        limit: 1,
      })
      if (results.docs.length > 0) {
        order = results.docs[0]
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Don't allow changing payment method on completed orders
    if (order.status === 'paid' || order.status === 'refunded') {
      return NextResponse.json(
        { error: 'Cannot change payment method on a completed order' },
        { status: 400 },
      )
    }

    // Validate against allowed payment methods
    const allowed = order.allowedPaymentMethods || ['cashapp', 'paypal']
    if (!allowed.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'This payment method is not available for this order' },
        { status: 400 },
      )
    }

    // Update the order's payment method
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentMethod },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true, paymentMethod })
  } catch (error: unknown) {
    console.error('[SELECT-PAYMENT-METHOD] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update payment method', details: errorMessage },
      { status: 500 },
    )
  }
}
