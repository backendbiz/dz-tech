import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import { generateCheckoutToken } from '@/lib/checkout-token'
import { generateOrderId } from '@/lib/order-generator'
import type { Service, Provider } from '@/payload-types'

/**
 * POST /api/v1/create-checkout
 *
 * Internal endpoint for the frontend "Buy" buttons.
 * Creates a pending order with a checkout token — no Stripe PI upfront.
 *
 * Body: { serviceId: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { serviceId } = body

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    const service = await payload.findByID({
      collection: 'services',
      id: serviceId,
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Auto-discover linked provider for redirect URLs
    let providerId: string | undefined
    let successRedirectUrl: string | undefined
    let cancelRedirectUrl: string | undefined

    try {
      const providers = await payload.find({
        collection: 'providers',
        where: {
          service: { equals: service.id },
          status: { equals: 'active' },
        },
        limit: 1,
      })

      if (providers.docs.length > 0) {
        const linked = providers.docs[0] as Provider
        providerId = linked.id
        successRedirectUrl = linked.successRedirectUrl || undefined
        cancelRedirectUrl = linked.cancelRedirectUrl || undefined
      }
    } catch {
      // Non-fatal
    }

    const checkoutToken = generateCheckoutToken()
    const clientOrderId = generateOrderId()

    const order = await payload.create({
      collection: 'orders',
      data: {
        service: service.id,
        status: 'pending',
        total: service.price,
        quantity: 1,
        checkoutToken,
        orderId: clientOrderId,
        ...(providerId && { provider: providerId }),
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      checkoutToken,
      orderId: order.id,
      amount: service.price,
      serviceName: service.title,
      serviceId: service.id,
      ...(successRedirectUrl && { successRedirectUrl }),
      ...(cancelRedirectUrl && { cancelRedirectUrl }),
    })
  } catch (error: unknown) {
    console.error('[CREATE-CHECKOUT] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 },
    )
  }
}
