import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

import {
  paymentIntentSucceeded,
  paymentIntentFailed,
  handleDisputeCreated,
  handleDisputeUpdated,
  handleDisputeClosed,
} from '@/stripe/webhooks'
import type Stripe from 'stripe'

// Disable body parsing - we need the raw body for webhook signature verification
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('=== STRIPE WEBHOOK RECEIVED ===')
  console.log('Timestamp:', new Date().toISOString())

  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('[WEBHOOK] No Stripe signature found in headers')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  console.log('[WEBHOOK] Signature present:', signature.substring(0, 20) + '...')

  // Get raw body as text for signature verification
  const body = await req.text()
  console.log('[WEBHOOK] Body length:', body.length, 'bytes')

  const webhookSecret = process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET

  if (!webhookSecret) {
    console.error('[WEBHOOK] STRIPE_WEBHOOKS_ENDPOINT_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Warn if the secret looks like a placeholder
  if (webhookSecret === 'whsec_your_webhook_secret' || !webhookSecret.startsWith('whsec_')) {
    console.error(
      '[WEBHOOK] ⚠️  STRIPE_WEBHOOKS_ENDPOINT_SECRET looks like a placeholder! Get the real secret from Stripe Dashboard > Developers > Webhooks',
    )
  }

  console.log('[WEBHOOK] Using webhook secret ending with:', webhookSecret.slice(-8))

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log('[WEBHOOK] ✅ Signature verified successfully')
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[WEBHOOK] ❌ Signature verification FAILED:', errMsg)
    console.error('[WEBHOOK] This usually means STRIPE_WEBHOOKS_ENDPOINT_SECRET is wrong.')
    console.error('[WEBHOOK] Current secret starts with:', webhookSecret.substring(0, 10) + '...')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[WEBHOOK] Event type:', event.type)
  console.log('[WEBHOOK] Event ID:', event.id)

  // Log PaymentIntent details for payment events
  if (event.type.startsWith('payment_intent')) {
    const pi = event.data.object as Stripe.PaymentIntent
    console.log('[WEBHOOK] PaymentIntent ID:', pi.id)
    console.log('[WEBHOOK] PaymentIntent status:', pi.status)
    console.log('[WEBHOOK] PaymentIntent amount:', pi.amount, 'cents')
    console.log('[WEBHOOK] PaymentIntent metadata:', JSON.stringify(pi.metadata))
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('[WEBHOOK] → Calling paymentIntentSucceeded handler')
        await paymentIntentSucceeded({ event })
        console.log('[WEBHOOK] ✅ paymentIntentSucceeded completed')
        break

      case 'payment_intent.payment_failed':
        console.log('[WEBHOOK] → Calling paymentIntentFailed handler')
        await paymentIntentFailed({ event })
        console.log('[WEBHOOK] ✅ paymentIntentFailed completed')
        break

      case 'charge.dispute.created':
        console.log('[WEBHOOK] → Calling handleDisputeCreated handler')
        await handleDisputeCreated({ event })
        break

      case 'charge.dispute.updated':
        console.log('[WEBHOOK] → Calling handleDisputeUpdated handler')
        await handleDisputeUpdated({ event })
        break

      case 'charge.dispute.closed':
        console.log('[WEBHOOK] → Calling handleDisputeClosed handler')
        await handleDisputeClosed({ event })
        break

      default:
        console.log(`[WEBHOOK] ⚠️  Unhandled event type: ${event.type}`)
    }

    console.log('[WEBHOOK] === WEBHOOK PROCESSING COMPLETE ===')
    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[WEBHOOK] ❌ Error processing webhook: ${errorMessage}`)
    if (error instanceof Error && error.stack) {
      console.error('[WEBHOOK] Stack trace:', error.stack)
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
