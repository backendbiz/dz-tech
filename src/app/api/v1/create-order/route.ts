import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import { isValidApiKeyFormat } from '@/lib/api-key'
import { generateCheckoutToken } from '@/lib/checkout-token'
import type { Payload } from 'payload'
import type { Service, Provider } from '@/payload-types'
import { generateOrderId } from '@/lib/order-generator'

/**
 * POST /api/v1/create-order
 *
 * Creates a pending order and returns a checkout URL WITHOUT creating a
 * Stripe PaymentIntent upfront. The payment method (Cash App / PayPal)
 * is chosen by the user on the checkout page, and the respective payment
 * session is initialised lazily at that point.
 *
 * This avoids wasting a Stripe PaymentIntent when the user ends up
 * paying with PayPal.
 */

/**
 * Validate provider API key and return provider with linked service
 */
async function validateProviderApiKey(
  payload: Payload,
  apiKey: string,
): Promise<{ provider: Provider; service: Service } | null> {
  if (!isValidApiKeyFormat(apiKey)) {
    return null
  }

  try {
    const result = await payload.find({
      collection: 'providers',
      where: {
        apiKey: { equals: apiKey },
        status: { equals: 'active' },
      },
      limit: 1,
      depth: 1,
    })

    if (result.docs.length === 0) {
      return null
    }

    const provider = result.docs[0]
    const service = provider.service as Service

    if (!service || typeof service === 'string') {
      return null
    }

    // Update last used timestamp (fire and forget)
    payload
      .update({
        collection: 'providers',
        id: provider.id,
        data: { lastUsedAt: new Date().toISOString() },
      })
      .catch((err) => console.error('Failed to update lastUsedAt:', err))

    return { provider, service }
  } catch (error) {
    console.error('Error validating provider API key:', error)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { apiKey, externalId } = body
    const payload = await getPayloadClient()

    // --- Authenticate via API key ---
    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
    }

    const providerResult = await validateProviderApiKey(payload, apiKey)
    if (!providerResult) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const service = providerResult.service
    const providerId = providerResult.provider.id
    const providerName = providerResult.provider.name

    console.log(
      `[CREATE-ORDER] Provider "${providerName}" authenticated, service: ${service.title}`,
    )

    // --- Determine amount & quantity ---
    let finalAmount = service.price
    let quantity = 1

    if (body.amount) {
      const requestedAmount = Number(body.amount)

      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount provided' }, { status: 400 })
      }

      if (requestedAmount % 5 !== 0) {
        return NextResponse.json({ error: 'Amount must be a multiple of 5' }, { status: 400 })
      }

      if (requestedAmount < service.price) {
        return NextResponse.json(
          { error: `Amount cannot be less than service price (${service.price})` },
          { status: 400 },
        )
      }

      quantity = requestedAmount / service.price
      if (!Number.isInteger(quantity)) {
        return NextResponse.json(
          { error: `Amount ${requestedAmount} is not divisible by service price ${service.price}` },
          { status: 400 },
        )
      }

      finalAmount = requestedAmount
    }

    // --- Idempotency: check for existing order with same externalId + provider ---
    if (externalId && providerId) {
      const existing = await payload.find({
        collection: 'orders',
        where: {
          and: [{ externalId: { equals: externalId } }, { provider: { equals: providerId } }],
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        const existingOrder = existing.docs[0]
        const token = existingOrder.checkoutToken || generateCheckoutToken()

        // Backfill token if missing
        if (!existingOrder.checkoutToken) {
          payload
            .update({
              collection: 'orders',
              id: existingOrder.id,
              data: { checkoutToken: token },
            })
            .catch((err) => console.error('Failed to backfill checkoutToken:', err))
        }

        const baseUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL || 'https://checkout.dztech.shop'
        return NextResponse.json({
          checkoutUrl: `${baseUrl}/checkout/o/${token}`,
          orderId: existingOrder.id,
          externalId: externalId || null,
          amount: existingOrder.total,
        })
      }
    }

    // --- Create the order (no Stripe PI) ---
    const checkoutToken = generateCheckoutToken()
    const clientOrderId = generateOrderId()

    const order = await payload.create({
      collection: 'orders',
      data: {
        service: service.id,
        status: 'pending',
        total: finalAmount,
        quantity,
        checkoutToken,
        orderId: clientOrderId,
        ...(providerId && { provider: providerId }),
        ...(externalId && { externalId }),
      },
      overrideAccess: true,
    })

    console.log(`[CREATE-ORDER] Created order ${order.id} (no payment intent yet)`)

    const baseUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL || 'https://checkout.dztech.shop'
    const checkoutUrl = `${baseUrl}/checkout/o/${checkoutToken}`

    return NextResponse.json({
      checkoutUrl,
      orderId: order.id,
      externalId: externalId || null,
      amount: finalAmount,
    })
  } catch (error: unknown) {
    console.error('[CREATE-ORDER] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create order', details: errorMessage },
      { status: 500 },
    )
  }
}
