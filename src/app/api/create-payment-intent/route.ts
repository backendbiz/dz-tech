import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import {
  getProviderGateway,
  getActiveGatewayName,
  isValidGatewayName,
  getRegisteredGatewayNames,
} from '@/lib/payment-gateway'
import type { GatewayCredentials } from '@/lib/payment-gateway'
import { isValidApiKeyFormat } from '@/lib/api-key'
import { generateCheckoutToken } from '@/lib/checkout-token'
import type { Payload } from 'payload'
import type { Service, Order, Provider } from '@/payload-types'

/**
 * Helper function to create a pending order with retry logic
 * Handles MongoDB WriteConflict errors (code 112)
 */
async function createPendingOrderWithRetry(
  payload: Payload,
  orderData: {
    serviceId?: string
    itemName?: string
    itemDescription?: string
    price: number
    quantity?: number
    paymentIntentId: string
    providerId?: string
    externalId?: string
    clientOrderId?: string
    checkoutToken: string
    paymentGateway?: string
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
        let existingOrder = existingOrders.docs[0]

        // Ensure existing order has a checkout token (backfill if needed)
        if (!existingOrder.checkoutToken) {
          console.log(`Backfilling checkoutToken for existing order: ${existingOrder.id}`)
          try {
            existingOrder = await payload.update({
              collection: 'orders',
              id: existingOrder.id,
              data: {
                checkoutToken: orderData.checkoutToken,
              },
            })
          } catch (err) {
            console.error('Failed to backfill checkoutToken:', err)
          }
        }

        console.log(
          `Order for payment intent ${orderData.paymentIntentId} already exists, returning existing`,
        )
        return existingOrder
      }

      // Create the order
      const order = await payload.create({
        collection: 'orders',
        data: {
          // Service is optional — only set if provided (service-based flow)
          ...(orderData.serviceId && { service: orderData.serviceId }),
          // Item info for provider-initiated orders without a service
          ...(orderData.itemName && { itemName: orderData.itemName }),
          ...(orderData.itemDescription && { itemDescription: orderData.itemDescription }),
          status: 'pending',
          total: orderData.price,
          quantity: orderData.quantity || 1,
          stripePaymentIntentId: orderData.paymentIntentId,
          // Also store in gateway-agnostic field
          gatewayPaymentId: orderData.paymentIntentId,
          paymentGateway: orderData.paymentGateway || getActiveGatewayName(),
          checkoutToken: orderData.checkoutToken,
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
 * Validate provider API key and return provider (no longer requires linked service)
 */
async function validateProviderApiKey(
  payload: Payload,
  apiKey: string,
): Promise<{ provider: Provider; service: Service | null } | null> {
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
      depth: 1, // Populate the service relationship (if exists)
    })

    if (result.docs.length === 0) {
      console.warn('No active provider found for API key')
      return null
    }

    const provider = result.docs[0]

    // Service is optional now — get it if it exists
    let service: Service | null = null
    if (provider.service && typeof provider.service !== 'string') {
      service = provider.service as Service
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

import { generateOrderId } from '@/lib/order-generator'

// ... existing imports

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
    // For provider-initiated orders without a service
    let itemName: string | undefined
    let itemDescription: string | undefined
    let isProviderFlow = false
    // Per-provider gateway preference (null = use global default)
    let providerGatewayName: string | null = null
    // Per-provider gateway credentials (when provider uses their own account)
    let providerCredentials: GatewayCredentials | undefined

    // Check if we are resuming an existing order
    let existingOrder: Order | null = null
    // Use provided orderId or generate one if missing (for new orders)
    const incomingOrderId = body.orderId || body.clientOrderId || generateOrderId()

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

        // Use the existing order's service (if it has one)
        if (existingOrder) {
          const orderService = existingOrder.service as Service
          if (orderService && typeof orderService !== 'string') {
            service = orderService
            console.log(`Resuming existing order: ${existingOrder.id}`)
          } else {
            // Provider-initiated order without service — still resume
            console.log(`Resuming existing provider order: ${existingOrder.id}`)
          }
        }
      } catch (_e) {
        console.warn('Could not find existing order:', incomingOrderId)
        // If not found, ignore and continue to create new (or fail if strictly required)
      }
    }

    // If we verify the existing order, recover the session
    if (existingOrder) {
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

          // Build checkout URL using token if available, or generate one
          let existingCheckoutToken = existingOrder.checkoutToken
          if (!existingCheckoutToken) {
            // Backfill: generate token for older orders that don't have one
            existingCheckoutToken = generateCheckoutToken()
            payload
              .update({
                collection: 'orders',
                id: existingOrder.id,
                data: { checkoutToken: existingCheckoutToken },
              })
              .catch((err) => console.error('Failed to backfill checkoutToken:', err))
          }

          // Determine display name — use service title or order's itemName
          const orderService = existingOrder.service as Service | null
          const displayName =
            orderService && typeof orderService !== 'string'
              ? orderService.title
              : (existingOrder as Order & { itemName?: string }).itemName || 'Payment'

          // Return the existing session details
          return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            orderId: existingOrder.id,
            checkoutToken: existingCheckoutToken,
            status: effectiveStatus,
            checkoutUrl: `${process.env.NEXT_PUBLIC_SERVER_URL || 'https://app.dztech.shop'}/checkout/o/${existingCheckoutToken}`,
            amount: existingOrder.total,
            quantity: existingOrder.quantity || 1,
            serviceName: displayName,
            serviceId:
              orderService && typeof orderService !== 'string' ? orderService.id : undefined,
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

      isProviderFlow = true
      providerId = providerResult.provider.id
      providerName = providerResult.provider.name
      successRedirectUrl = providerResult.provider.successRedirectUrl || undefined
      cancelRedirectUrl = providerResult.provider.cancelRedirectUrl || undefined
      // Gateway priority: request body > provider setting > platform default
      const provGw = providerResult.provider.paymentGateway
      providerGatewayName = provGw && provGw !== 'default' ? provGw : null

      // Allow per-request gateway override
      if (body.gateway) {
        if (!isValidGatewayName(body.gateway)) {
          return NextResponse.json(
            {
              error: `Invalid gateway: "${body.gateway}". Available: ${getRegisteredGatewayNames().join(', ')}`,
            },
            { status: 400 },
          )
        }
        providerGatewayName = body.gateway
      }

      // Extract provider's own gateway credentials if enabled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerDoc = providerResult.provider as any
      if (providerDoc.useOwnGatewayCredentials && providerDoc.gatewayCredentials) {
        const creds = providerDoc.gatewayCredentials as Record<string, string | undefined>
        providerCredentials = {
          stripeSecretKey: creds._decryptedStripeSecretKey || undefined,
          stripePublishableKey: creds.stripePublishableKey || undefined,
          stripeWebhookSecret: creds._decryptedStripeWebhookSecret || undefined,
          squareAccessToken: creds._decryptedSquareAccessToken || undefined,
          squareLocationId: creds.squareLocationId || undefined,
          squareApplicationId: creds.squareApplicationId || undefined,
          paypalClientId: creds.paypalClientId || undefined,
          paypalClientSecret: creds._decryptedPaypalClientSecret || undefined,
          cryptoGatewayApiKey: creds._decryptedCryptoGatewayApiKey || undefined,
        }
        console.log(`Provider "${providerName}" using own gateway credentials`)
      }

      // Provider can send item name and description directly
      itemName = body.itemName || body.description || providerResult.provider.name
      itemDescription = body.itemDescription || body.description || undefined

      // If provider has a linked service, use it (backwards compat)
      if (providerResult.service) {
        service = providerResult.service
        console.log(
          `Provider "${providerName}" authenticated with linked service: ${service.title}`,
        )
      } else {
        console.log(`Provider "${providerName}" authenticated (no linked service)`)
      }
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
    } else if (!existingOrder) {
      return NextResponse.json({ error: 'Either serviceId or apiKey is required' }, { status: 400 })
    }

    // Auto-discover Provider if not set (for ServiceID flows)
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

    // Determine final amount and quantity
    let finalAmount: number
    let quantity = 1

    if (isProviderFlow && !service) {
      // === Provider flow without service ===
      // Amount is required and sent directly by the provider
      if (!body.amount) {
        return NextResponse.json(
          { error: 'Amount is required for provider payments' },
          { status: 400 },
        )
      }

      const requestedAmount = Number(body.amount)
      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount provided' }, { status: 400 })
      }

      finalAmount = requestedAmount
      quantity = body.quantity || 1
    } else if (service) {
      // === Service-based flow ===
      finalAmount = service.price

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

        // 2. Validate amount is at least the service price
        if (requestedAmount < service.price) {
          return NextResponse.json(
            { error: `Amount cannot be less than service price (${service.price})` },
            { status: 400 },
          )
        }

        // 3. Calculate quantity
        quantity = requestedAmount / service.price

        if (!Number.isInteger(quantity)) {
          return NextResponse.json(
            {
              error: `Amount ${requestedAmount} is not divisible by service price ${service.price}`,
            },
            { status: 400 },
          )
        }

        finalAmount = requestedAmount
      }
    } else {
      return NextResponse.json({ error: 'Cannot determine payment amount' }, { status: 400 })
    }

    // Use the payment gateway (provider-specific or global default)
    const gateway = getProviderGateway(providerGatewayName)

    // Create idempotency key to prevent duplicate PaymentIntents
    // Priority: externalId (provider) > incomingOrderId (client) > random (fallback)
    let idempotencyKey: string
    const idempotencyBase = service?.id || providerId || 'direct'
    if (externalId) {
      idempotencyKey = `pi_${idempotencyBase}_${externalId}_${finalAmount}`
    } else if (incomingOrderId) {
      idempotencyKey = `pi_${idempotencyBase}_${incomingOrderId}_${finalAmount}`
    } else {
      idempotencyKey = `pi_${idempotencyBase}_${Date.now()}_${Math.random().toString(36).substring(7)}`
    }

    // Build payment description
    const displayName = service?.title || itemName || 'Payment'
    const paymentDescription = `${displayName} | Direct${providerName ? ` (${providerName})` : ''}`

    // Build metadata
    const metadata: Record<string, string> = {}
    if (service) metadata.serviceId = service.id
    if (providerId) metadata.providerId = providerId
    if (externalId) metadata.externalId = externalId

    // Create payment via the gateway
    const paymentResult = await gateway.createPayment({
      amount: finalAmount,
      currency: 'usd',
      description: paymentDescription,
      metadata,
      idempotencyKey,
      credentials: providerCredentials,
    })

    // Generate a unique checkout token for this session
    let checkoutToken = generateCheckoutToken()

    // Create a pending order in the database with retry logic
    let orderId: string
    try {
      const order = await createPendingOrderWithRetry(payload, {
        serviceId: service?.id,
        itemName: isProviderFlow ? itemName : undefined,
        itemDescription: isProviderFlow ? itemDescription : undefined,
        price: finalAmount,
        quantity: quantity,
        paymentIntentId: paymentResult.paymentId,
        providerId,
        externalId,
        clientOrderId: incomingOrderId,
        checkoutToken,
        paymentGateway: gateway.name,
      })
      orderId = order.id

      // If we resumed an existing order, use its token instead of the new one
      if (order.checkoutToken) {
        checkoutToken = order.checkoutToken
      }
    } catch (dbError) {
      console.error('Error creating pending order after retries:', dbError)
      // Generate a temporary ID if order creation fails
      orderId = `temp_${paymentResult.paymentId}`
    }

    // Construct the checkout URL using the secure token
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://app.dztech.shop'
    const checkoutUrl = `${baseUrl}/checkout/o/${checkoutToken}`

    const response = {
      clientSecret: paymentResult.clientSecret,
      orderId,
      checkoutToken,
      checkoutUrl,
      amount: finalAmount,
      quantity,
      serviceName: service?.title || itemName || 'Payment',
      serviceId: service?.id,
      stripePublishableKey: gateway.getPublishableKey(),
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
