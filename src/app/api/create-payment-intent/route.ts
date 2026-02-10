import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { isValidApiKeyFormat } from '@/lib/api-key'
import type { Payload } from 'payload'
import type { Service, Order, Provider } from '@/payload-types'

/**
 * Helper function to create a pending order with retry logic
 * Handles MongoDB WriteConflict errors (code 112)
 */
async function createPendingOrderWithRetry(
  payload: Payload,
  orderData: {
    serviceId: string
    price: number
    quantity?: number
    paymentIntentId: string
    providerId?: string
    externalId?: string
    clientOrderId?: string
  },
  maxRetries: number = 3,
): Promise<Order> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if order already exists for this payment intent
      const existingOrders = await payload.find({
        collection: 'orders',
        where: {
          stripePaymentIntentId: { equals: orderData.paymentIntentId },
        },
        limit: 1,
      })

      if (existingOrders.docs.length > 0) {
        // Order already exists, return it
        console.log(
          `Order for payment intent ${orderData.paymentIntentId} already exists, returning existing`,
        )
        return existingOrders.docs[0]
      }

      // Create the order
      const order = await payload.create({
        collection: 'orders',
        data: {
          service: orderData.serviceId,
          status: 'pending',
          total: orderData.price,
          quantity: orderData.quantity || 1,
          stripePaymentIntentId: orderData.paymentIntentId,
          // Store provider reference if applicable
          ...(orderData.providerId && { provider: orderData.providerId }),
          // Store external ID for provider tracking
          ...(orderData.externalId && { externalId: orderData.externalId }),
          // Store client-generated Order ID
          ...(orderData.clientOrderId && { orderId: orderData.clientOrderId }),
        },
      })

      console.log(`Successfully created pending order: ${order.id}`)
      return order
    } catch (error: unknown) {
      const mongoError = error as { code?: number; codeName?: string }

      // Handle WriteConflict (code 112) - retry with exponential backoff
      if (mongoError.code === 112 || mongoError.codeName === 'WriteConflict') {
        console.warn(
          `WriteConflict on attempt ${attempt + 1}/${maxRetries} for payment intent ${orderData.paymentIntentId}`,
        )

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms...
          const delay = Math.pow(2, attempt) * 100
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      // Handle duplicate key error (code 11000) - order was created by another request
      if (mongoError.code === 11000) {
        console.log(
          `Order for payment intent ${orderData.paymentIntentId} was created by another request, fetching it`,
        )
        // Fetch and return the existing order
        const existingOrders = await payload.find({
          collection: 'orders',
          where: {
            stripePaymentIntentId: { equals: orderData.paymentIntentId },
          },
          limit: 1,
        })
        if (existingOrders.docs.length > 0) {
          return existingOrders.docs[0]
        }
      }

      // If we've exhausted retries or it's a different error, throw
      throw error
    }
  }

  throw new Error('Failed to create order after max retries')
}

/**
 * Validate provider API key and return provider with linked service
 */
async function validateProviderApiKey(
  payload: Payload,
  apiKey: string,
): Promise<{ provider: Provider; service: Service } | null> {
  // Quick format check before database query
  if (!isValidApiKeyFormat(apiKey)) {
    console.warn('Invalid API key format provided')
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
      depth: 1, // Populate the service relationship
    })

    if (result.docs.length === 0) {
      console.warn('No active provider found for API key')
      return null
    }

    const provider = result.docs[0]

    // Get the linked service
    const service = provider.service as Service
    if (!service || typeof service === 'string') {
      console.error('Provider service not populated or missing')
      return null
    }

    // Update last used timestamp (fire and forget)
    payload
      .update({
        collection: 'providers',
        id: provider.id,
        data: {
          lastUsedAt: new Date().toISOString(),
        },
      })
      .catch((err) => console.error('Failed to update lastUsedAt:', err))

    return {
      provider,
      service,
    }
  } catch (error) {
    console.error('Error validating provider API key:', error)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { serviceId, apiKey, externalId } = body
    const payload = await getPayloadClient()

    let service: Service | undefined
    let providerId: string | undefined
    let providerName: string | undefined
    let successRedirectUrl: string | undefined
    let cancelRedirectUrl: string | undefined

    // Check if we are resuming an existing order
    let existingOrder: Order | null = null
    const incomingOrderId = body.orderId || body.clientOrderId

    if (incomingOrderId) {
      try {
        // Check if it's a MongoDB ObjectId (24 hex chars) or a client-generated ID (ORD-xxx)
        const isObjectId = /^[a-f\d]{24}$/i.test(incomingOrderId)

        if (isObjectId) {
          // Try to find by document ID
          const orderResult = await payload.findByID({
            collection: 'orders',
            id: incomingOrderId,
            depth: 1, // Populate service
          })
          if (orderResult) {
            existingOrder = orderResult
          }
        } else {
          // Search by orderId field (client-generated ID like ORD-xxx)
          const orderResults = await payload.find({
            collection: 'orders',
            where: {
              orderId: { equals: incomingOrderId },
            },
            depth: 1,
            limit: 1,
          })
          if (orderResults.docs.length > 0) {
            existingOrder = orderResults.docs[0]
          }
        }

        // Use the existing order's service
        if (existingOrder) {
          const orderService = existingOrder.service as Service
          if (orderService && typeof orderService !== 'string') {
            service = orderService
            console.log(`Resuming existing order: ${existingOrder.id}`)
          }
        }
      } catch (_e) {
        console.warn('Could not find existing order:', incomingOrderId)
        // If not found, ignore and continue to create new (or fail if strictly required)
      }
    }

    // If we verify the existing order, recover the session
    if (existingOrder && service) {
      // Use default Stripe instance
      const stripe = getStripe()

      if (existingOrder.stripePaymentIntentId) {
        try {
          // Retrieve the existing payment intent
          const paymentIntent = await stripe.paymentIntents.retrieve(
            existingOrder.stripePaymentIntentId,
          )

          // Check if Stripe status is succeeded but DB is not updated yet (webhook lag)
          // Only override if the order is not already in a final state like disputed or refunded
          let effectiveStatus = existingOrder.status
          if (
            paymentIntent.status === 'succeeded' &&
            (effectiveStatus === 'pending' || effectiveStatus === 'failed')
          ) {
            effectiveStatus = 'paid'
          }

          // Return the existing session details
          return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            orderId: existingOrder.id,
            status: effectiveStatus,
            checkoutUrl: `${process.env.NEXT_PUBLIC_SERVER_URL || 'https://app.dztech.shop'}/checkout?serviceId=${service.id}&orderId=${existingOrder.id}`,
            amount: existingOrder.total,
            quantity: existingOrder.quantity || 1,
            serviceName: service.title,
            serviceId: service.id,
            stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            provider:
              typeof existingOrder.provider === 'object' ? existingOrder.provider?.name : undefined,
            providerId:
              typeof existingOrder.provider === 'object'
                ? existingOrder.provider?.id
                : existingOrder.provider,
            successRedirectUrl:
              typeof existingOrder.provider === 'object'
                ? existingOrder.provider?.successRedirectUrl
                : undefined,
            cancelRedirectUrl:
              typeof existingOrder.provider === 'object'
                ? existingOrder.provider?.cancelRedirectUrl
                : undefined,
          })
        } catch (stripeError) {
          console.error('Failed to retrieve existing payment intent:', stripeError)
          // Fallback to creating new one if retrieval fails?
          // Ideally we should error out or retry. For now, let's allow falling through to create new if strictly needed,
          // but better to error to avoid double charge.
          return NextResponse.json({ error: 'Failed to retrieve payment session' }, { status: 500 })
        }
      }
    }

    // === Standard Flow (New Order) ===

    // Check if this is an external provider request (using API key)
    if (apiKey) {
      const providerResult = await validateProviderApiKey(payload, apiKey)

      if (!providerResult) {
        return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
      }

      service = providerResult.service
      providerId = providerResult.provider.id
      providerName = providerResult.provider.name
      successRedirectUrl = providerResult.provider.successRedirectUrl || undefined
      cancelRedirectUrl = providerResult.provider.cancelRedirectUrl || undefined

      console.log(`Provider "${providerName}" authenticated, using service: ${service.title}`)
    } else if (serviceId && !existingOrder) {
      // Only look up service if we didn't already find it via order
      // Direct service ID request (existing behavior)
      const foundService = await payload.findByID({
        collection: 'services',
        id: serviceId,
      })

      if (!foundService) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 })
      }

      service = foundService
    } else {
      return NextResponse.json({ error: 'Either serviceId or apiKey is required' }, { status: 400 })
    }

    // Auto-discover Provider if not set (for PaymentLink or ServiceID flows)
    if (!providerId && service) {
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
          const linkedProvider = providers.docs[0]
          providerId = linkedProvider.id
          providerName = linkedProvider.name
          successRedirectUrl = linkedProvider.successRedirectUrl || undefined
          cancelRedirectUrl = linkedProvider.cancelRedirectUrl || undefined
          console.log(`Auto-linked service ${service.title} to provider ${providerName}`)
        }
      } catch (err) {
        console.error('Error finding linked provider:', err)
      }
    }

    // Always use default Stripe account (Single Stripe Account Workflow)
    const stripe = getStripe()

    // Determine final amount and quantity
    // Default to service price if no specific amount is requested
    let finalAmount = service.price
    let quantity = 1

    // If a custom amount is provided by the provider
    if (body.amount) {
      const requestedAmount = Number(body.amount)

      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount provided' }, { status: 400 })
      }

      // 1. Validate amount is a multiple of 5
      if (requestedAmount % 5 !== 0) {
        return NextResponse.json({ error: 'Amount must be a multiple of 5' }, { status: 400 })
      }

      // 2. Validate amount is at least the service price (optional, but good practice)
      if (requestedAmount < service.price) {
        return NextResponse.json(
          { error: `Amount cannot be less than service price (${service.price})` },
          { status: 400 },
        )
      }

      // 3. Calculate quantity
      // Logic: Quantity = Requested Amount / Service Price
      // Example: Service=5, Amount=100 -> Quantity=20
      quantity = requestedAmount / service.price

      // Ensure quantity is a whole number (optional check)
      if (!Number.isInteger(quantity)) {
        return NextResponse.json(
          { error: `Amount ${requestedAmount} is not divisible by service price ${service.price}` },
          { status: 400 },
        )
      }

      finalAmount = requestedAmount
    }

    // Create idempotency key to prevent duplicate PaymentIntents
    // Priority: externalId (provider) > incomingOrderId (client) > random (fallback)
    let idempotencyKey: string
    if (externalId) {
      // Provider-initiated: use external ID
      idempotencyKey = `pi_${service.id}_${externalId}_${finalAmount}`
    } else if (incomingOrderId) {
      // Client-initiated: use client order ID (ORD-xxx)
      idempotencyKey = `pi_${service.id}_${incomingOrderId}_${finalAmount}`
    } else {
      // Fallback: random (shouldn't normally happen)
      idempotencyKey = `pi_${service.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`
    }

    const paymentDescription = `${service.title} | Direct${providerName ? ` (${providerName})` : ''}`

    // Create a PaymentIntent using the service's Stripe account
    // Note: Cash App is only available for US-based Stripe accounts
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(finalAmount * 100), // Amount in cents
        currency: 'usd',
        // Cash App only - requires US-based Stripe account
        payment_method_types: ['cashapp'],
        // Description visible in Stripe Dashboard for easy identification
        description: paymentDescription,
        metadata: {
          serviceId: service.id,
          // Store provider info if applicable
          ...(providerId && { providerId }),
          // Store external ID for provider tracking
          ...(externalId && { externalId }),
        },
      },
      {
        idempotencyKey, // Prevents duplicate payment intents
      },
    )

    // Create a pending order in the database with retry logic
    let orderId: string
    try {
      const order = await createPendingOrderWithRetry(payload, {
        serviceId: service.id,
        price: finalAmount,
        quantity: quantity,
        paymentIntentId: paymentIntent.id,
        providerId,
        externalId,
        clientOrderId: incomingOrderId, // Pass frontend ID
      })
      orderId = order.id
    } catch (dbError) {
      console.error('Error creating pending order after retries:', dbError)
      // Generate a temporary ID if order creation fails
      orderId = `temp_${paymentIntent.id}`
    }

    // Construct the checkout URL
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://app.dztech.shop'
    const checkoutUrl = `${baseUrl}/checkout?serviceId=${service.id}&orderId=${orderId}`

    const response = {
      clientSecret: paymentIntent.client_secret,
      orderId,
      checkoutUrl,
      amount: finalAmount,
      quantity,
      serviceName: service.title,
      serviceId: service.id,
      stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      ...(providerName && { provider: providerName }),
      ...(providerId && { providerId }),
      ...(externalId && { externalId }),
      ...(successRedirectUrl && { successRedirectUrl }),
      ...(cancelRedirectUrl && { cancelRedirectUrl }),
    }

    // If request came from a provider (via apiKey), return specific/minimal details
    if (apiKey) {
      return NextResponse.json({
        checkoutUrl,
        orderId,
        externalId: externalId || null,
        amount: finalAmount,
      })
    }

    // Otherwise return full details for the frontend
    return NextResponse.json(response)
  } catch (error: unknown) {
    console.error('Error creating payment intent:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check if this is a Cash App not available error
    // This happens when the Stripe account is not US-based
    if (
      errorMessage.includes('cashapp') ||
      errorMessage.includes('payment_method_types') ||
      errorMessage.includes('not available')
    ) {
      return NextResponse.json(
        {
          error: 'Cash App payments are not available for this service',
          details:
            'This payment method requires a US-based Stripe account. Please contact support.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent', details: errorMessage },
      { status: 500 },
    )
  }
}
