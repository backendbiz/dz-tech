import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import {
  getStripe,
  getStripeForService,
  getStripeCredentialsForService,
  type ServiceStripeConfig,
} from '@/lib/stripe'
import { generateOrderId } from '@/lib/order-generator'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { serviceId, orderId: clientOrderId } = body
    const payload = await getPayloadClient()

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }

    // Fetch the service details including Stripe configuration
    const service = await payload.findByID({
      collection: 'services',
      id: serviceId,
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Get Stripe credentials for this service (custom or default)
    const stripeConfig = service.stripeConfig as ServiceStripeConfig | undefined
    const stripeCredentials = getStripeCredentialsForService(stripeConfig)

    // Get the appropriate Stripe instance
    const stripe =
      stripeCredentials.secretKey !== process.env.STRIPE_SECRET_KEY
        ? getStripeForService(stripeCredentials.secretKey)
        : getStripe()

    // Use provided orderId or generate a new one
    const orderId = clientOrderId || generateOrderId()

    // Create a PaymentIntent using the service's Stripe account
    // Note: Cash App is only available for US-based Stripe accounts
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(service.price * 100), // Amount in cents
      currency: 'usd',
      // Cash App only - requires US-based Stripe account
      payment_method_types: ['cashapp'],
      metadata: {
        serviceId: service.id,
        orderId: orderId,
        serviceName: service.title,
        // Store which Stripe account was used (for webhook routing)
        useCustomStripeAccount: stripeConfig?.useCustomStripeAccount ? 'true' : 'false',
      },
    })

    // Create a pending order in the database
    try {
      const existingOrders = await payload.find({
        collection: 'orders',
        where: {
          orderId: { equals: orderId },
        },
      })

      if (existingOrders.docs.length === 0) {
        await payload.create({
          collection: 'orders',
          data: {
            orderId,
            service: serviceId,
            status: 'pending',
            total: service.price,
            stripePaymentIntentId: paymentIntent.id,
          },
        })
      }
    } catch (dbError) {
      console.error('Error creating pending order:', dbError)
      // Continue even if order creation fails - payment can still proceed
    }

    // Return the client secret AND the publishable key for this service
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId,
      amount: service.price,
      serviceName: service.title,
      // Include the publishable key so frontend can use the correct Stripe account
      stripePublishableKey: stripeCredentials.publishableKey,
    })
  } catch (error: unknown) {
    console.error('Error creating payment intent:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check if this is a Cash App not available error
    const isCashAppUnavailable =
      errorMessage.includes('cashapp') &&
      (errorMessage.includes('not supported') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('invalid_request_error'))

    if (isCashAppUnavailable) {
      return NextResponse.json(
        {
          error: 'Cash App payments are not available for this service. Please contact support.',
          errorCode: 'CASHAPP_UNAVAILABLE',
          details:
            'The Stripe account for this service is not based in the United States, which is required for Cash App payments.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
