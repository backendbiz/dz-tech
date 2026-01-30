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

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('No Stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // Get raw body as text for signature verification
  const body = await req.text()
  const webhookSecret = process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOKS_ENDPOINT_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
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
