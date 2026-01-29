# Stripe Webhook Setup Guide

> Complete guide for setting up Stripe webhooks for payment event handling.

## Table of Contents

1. [Overview](#overview)
2. [Local Development Setup](#local-development-setup)
3. [Production Setup](#production-setup)
4. [Multi-Account Webhooks](#multi-account-webhooks)
5. [Event Handlers](#event-handlers)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks allow Stripe to notify your application when events happen in your account, such as:

- ✅ **Payment succeeded** — Update order status to "paid"
- ❌ **Payment failed** — Update order status to "failed"
- 📦 **Checkout completed** — Create or update order records

### Webhook Endpoint

Your webhook endpoint is located at:

```
/api/stripe/webhooks
```

**Full URL Examples:**

- Local: `http://localhost:3000/api/stripe/webhooks`
- Production: `https://your-domain.com/api/stripe/webhooks`

---

## Local Development Setup

### Step 1: Install Stripe CLI

```bash
# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# Linux (apt)
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

### Step 2: Login to Stripe

```bash
stripe login
```

This opens a browser window to authenticate with your Stripe account.

### Step 3: Forward Webhooks to Local Server

Start your dev server first:

```bash
pnpm run dev
```

Then in a **new terminal**, run:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks
```

You'll see output like:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxx
```

### Step 4: Update Environment Variables

Copy the webhook secret to your `.env` file:

```bash
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_xxxxxxxxxxxxxxxx
```

### Step 5: Restart Dev Server

Stop and restart your dev server to pick up the new environment variable.

---

## Production Setup

### Step 1: Open Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure you're in the correct mode (Test or Live)
3. Navigate to **Developers** → **Webhooks**

### Step 2: Add Endpoint

Click **"Add endpoint"** and configure:

| Setting          | Value                                         |
| ---------------- | --------------------------------------------- |
| **Endpoint URL** | `https://your-domain.com/api/stripe/webhooks` |
| **Description**  | (Optional) DZTech Payment Webhooks            |
| **Listen to**    | Events on your account                        |

### Step 3: Select Events

Click **"Select events"** and choose:

| Event                           | Description                             |
| ------------------------------- | --------------------------------------- |
| `checkout.session.completed`    | Checkout session successfully completed |
| `payment_intent.succeeded`      | Payment was successful                  |
| `payment_intent.payment_failed` | Payment attempt failed                  |

### Step 4: Get Signing Secret

After creating the endpoint:

1. Click on the webhook endpoint
2. Under **"Signing secret"**, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)

### Step 5: Set Environment Variable

Add to your production environment:

```bash
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_live_xxxxxxxxxxxxxxxx
```

---

## Multi-Account Webhooks

If you're using **different Stripe accounts per service**, each account needs its own webhook configuration.

### For Each Stripe Account:

1. **Login to that Stripe account**
2. **Create a webhook endpoint** pointing to the same URL:
   ```
   https://your-domain.com/api/stripe/webhooks
   ```
3. **Select the same events** (see list above)
4. **Copy the webhook secret**
5. **Add it to the service** in the PayloadCMS admin panel

### How It Works

The webhook handler tries to verify signatures using:

1. Default webhook secret (from `.env`)
2. All per-service webhook secrets (from database)

The first successful verification is used to process the event.

### Architecture Diagram

```
Stripe Account A ─────┐
                      │
Stripe Account B ─────┼──→ /api/stripe/webhooks ──→ Verify & Process
                      │
Stripe Account C ─────┘
```

---

## Event Handlers

Event handlers are defined in `src/stripe/webhooks.ts`:

### payment_intent.succeeded

Called when a payment is successful.

```typescript
export const paymentIntentSucceeded = async ({ event, payload }) => {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const orderId = paymentIntent.metadata?.orderId

  if (orderId) {
    // Find and update the order
    const orders = await payload.find({
      collection: 'orders',
      where: { orderId: { equals: orderId } },
    })

    if (orders.docs.length > 0) {
      await payload.update({
        collection: 'orders',
        id: orders.docs[0].id,
        data: { status: 'paid' },
      })
    }
  }
}
```

### payment_intent.payment_failed

Called when a payment fails.

```typescript
export const paymentIntentFailed = async ({ event, payload }) => {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const orderId = paymentIntent.metadata?.orderId

  if (orderId) {
    // Find and update the order
    const orders = await payload.find({
      collection: 'orders',
      where: { orderId: { equals: orderId } },
    })

    if (orders.docs.length > 0) {
      await payload.update({
        collection: 'orders',
        id: orders.docs[0].id,
        data: { status: 'failed' },
      })
    }
  }
}
```

### checkout.session.completed

Called when a Checkout Session completes.

```typescript
export const checkoutSessionCompleted = async ({ event, payload }) => {
  const session = event.data.object as Stripe.Checkout.Session
  // Process the completed checkout session
}
```

---

## Testing

### Test Using Stripe CLI

Trigger specific events:

```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test checkout completion
stripe trigger checkout.session.completed
```

### Test with Real Payments

1. Start your dev server
2. Start webhook forwarding: `stripe listen --forward-to http://localhost:3000/api/stripe/webhooks`
3. Go through the checkout flow using test card: `4242 4242 4242 4242`
4. Watch the terminal for webhook events

### View Webhook Logs

```bash
# See recent webhook events
stripe events list --limit 10

# Get details of a specific event
stripe events retrieve evt_xxxxxxxxxxxxx
```

---

## Troubleshooting

### Common Issues

#### "No webhook secret configured"

**Cause:** `STRIPE_WEBHOOKS_ENDPOINT_SECRET` is not set.

**Solution:**

1. Get webhook secret from Stripe CLI or Dashboard
2. Add to `.env` file
3. Restart dev server

#### "Webhook signature verification failed"

**Cause:** Wrong webhook secret or modified request body.

**Solutions:**

1. Verify the webhook secret matches the endpoint
2. Make sure you're using the raw request body (not parsed JSON)
3. Check that no middleware is modifying the request

#### "Webhook received but handler not called"

**Cause:** Event type not handled.

**Solution:** Check that the event type is listed in `STRIPE_CONFIG.webhookEvents` and has a handler.

#### "Connection refused" (Local Development)

**Cause:** Dev server not running.

**Solution:**

1. Start your dev server first: `pnpm run dev`
2. Then run: `stripe listen --forward-to http://localhost:3000/api/stripe/webhooks`

### Debug Mode

Add logging to your webhook handler:

```typescript
// In src/app/api/stripe/webhooks/route.ts
console.log('Webhook received:', event.type)
console.log('Event ID:', event.id)
console.log('Metadata:', event.data.object.metadata)
```

### View Latest Events in Stripe Dashboard

1. Go to **Developers** → **Events**
2. Filter by event type
3. Click on an event to see details
4. Check the "Webhook attempts" tab for delivery status

---

## Quick Reference

### Environment Variables

```bash
# Required
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_xxxxxxxxxxxxx

# For per-service accounts, set in PayloadCMS admin:
# Services → [Service Name] → Stripe Configuration → Webhook Signing Secret
```

### Stripe CLI Commands

```bash
# Login
stripe login

# Forward webhooks
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger checkout.session.completed

# View events
stripe events list --limit 10
```

### Supported Events

| Event                           | Handler                    | Action                    |
| ------------------------------- | -------------------------- | ------------------------- |
| `payment_intent.succeeded`      | `paymentIntentSucceeded`   | Updates order to "paid"   |
| `payment_intent.payment_failed` | `paymentIntentFailed`      | Updates order to "failed" |
| `checkout.session.completed`    | `checkoutSessionCompleted` | Creates/updates order     |

---

## Security Best Practices

1. **Always verify webhook signatures** — Never process unverified webhooks
2. **Use HTTPS in production** — Stripe requires HTTPS for webhook endpoints
3. **Handle idempotently** — Webhooks may be sent multiple times
4. **Respond quickly** — Return 200 within 30 seconds
5. **Log events** — Keep records for debugging and auditing

---

_Documentation last updated: January 2026_
