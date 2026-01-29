import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getStripeForService, type ServiceStripeConfig } from '@/lib/stripe'
import { getPayloadClient } from '@/lib/payload'
import {
  checkoutSessionCompleted,
  paymentIntentSucceeded,
  paymentIntentFailed,
} from '@/stripe/webhooks'
import type Stripe from 'stripe'

// Disable body parsing - we need the raw body for webhook signature verification
export const dynamic = 'force-dynamic'

/**
 * Try to verify webhook with a specific secret
 */
function tryVerifyWebhook(
  stripe: Stripe,
  body: string,
  signature: string,
  webhookSecret: string,
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return null
  }
}

/**
 * Get all unique webhook secrets from services + default
 */
async function getAllWebhookSecrets(): Promise<Array<{ secret: string; stripeSecretKey: string }>> {
  const secrets: Array<{ secret: string; stripeSecretKey: string }> = []

  // Add default secret
  const defaultSecret = process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET
  const defaultStripeKey = process.env.STRIPE_SECRET_KEY || ''

  if (defaultSecret) {
    secrets.push({ secret: defaultSecret, stripeSecretKey: defaultStripeKey })
  }

  // Get all services with custom Stripe configs
  try {
    const payload = await getPayloadClient()
    const services = await payload.find({
      collection: 'services',
      where: {
        'stripeConfig.useCustomStripeAccount': { equals: true },
      },
      limit: 100,
    })

    for (const service of services.docs) {
      const stripeConfig = service.stripeConfig as ServiceStripeConfig | undefined
      if (stripeConfig?.stripeWebhookSecret && stripeConfig?.stripeSecretKey) {
        // Avoid duplicates
        const exists = secrets.some((s) => s.secret === stripeConfig.stripeWebhookSecret)
        if (!exists) {
          secrets.push({
            secret: stripeConfig.stripeWebhookSecret,
            stripeSecretKey: stripeConfig.stripeSecretKey,
          })
        }
      }
    }
  } catch (error) {
    console.error('Error fetching service webhook secrets:', error)
  }

  return secrets
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('No Stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // Get raw body as text for signature verification
  const body = await req.text()

  // Get all webhook secrets (default + per-service)
  const webhookSecrets = await getAllWebhookSecrets()

  if (webhookSecrets.length === 0) {
    console.error('No webhook secrets configured')
    return NextResponse.json({ error: 'Webhook secrets not configured' }, { status: 500 })
  }

  // Try to verify with each secret until one succeeds
  let event: Stripe.Event | null = null

  for (const { secret, stripeSecretKey } of webhookSecrets) {
    const stripe =
      stripeSecretKey === process.env.STRIPE_SECRET_KEY
        ? getStripe()
        : getStripeForService(stripeSecretKey)

    event = tryVerifyWebhook(stripe, body, signature, secret)

    if (event) {
      console.log(`Webhook verified with secret ending in ...${secret.slice(-4)}`)
      break
    }
  }

  if (!event) {
    console.error('Webhook signature verification failed with all secrets')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await checkoutSessionCompleted({ event })
        break

      case 'payment_intent.succeeded':
        await paymentIntentSucceeded({ event })
        break

      case 'payment_intent.payment_failed':
        await paymentIntentFailed({ event })
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error processing webhook: ${errorMessage}`)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
