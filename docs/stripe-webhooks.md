# Stripe Webhook Setup Guide

> Complete guide for setting up Stripe webhooks for payment and dispute event handling.

## Table of Contents

1. [Overview](#overview)
2. [Local Development Setup](#local-development-setup)
3. [Production Setup](#production-setup)
4. [Event Handlers](#event-handlers)
5. [Dispute Handling](#dispute-handling)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks allow Stripe to notify your application when events happen in your account, such as:

- ✅ **Payment succeeded** — Update order status to "paid"
- ❌ **Payment failed** — Update order status to "failed"
- ⚖️ **Dispute created** — Update order status to "disputed"
- 🔄 **Dispute updated** — Track dispute status changes
- 🏁 **Dispute closed** — Record dispute outcome (won/lost)

### Webhook Endpoint

Your webhook endpoint is located at:

```
/api/stripe/webhooks
```

**Full URL Examples:**

- Local: `http://localhost:3000/api/stripe/webhooks`
- Production: `https://your-domain.com/api/stripe/webhooks`

### Per-Provider Webhook Considerations

If a provider uses **their own Stripe account** (via per-provider credentials), webhook events will come from the provider's Stripe account, not the platform's. In this case:

1. The provider must create a webhook endpoint on **their** Stripe Dashboard pointing to the same DZTech webhook URL
2. The provider's `stripeWebhookSecret` should be stored in their gateway credentials (encrypted) in the admin panel
3. The platform webhook handler will verify using the appropriate signing secret

> **Note**: Currently, the platform uses the global `STRIPE_WEBHOOKS_ENDPOINT_SECRET` for webhook verification. Per-provider webhook secret routing is a planned enhancement.

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

| Event                           | Description                           |
| ------------------------------- | ------------------------------------- |
| `payment_intent.succeeded`      | Payment was successful                |
| `payment_intent.payment_failed` | Payment attempt failed                |
| `charge.dispute.created`        | A dispute was opened against a charge |
| `charge.dispute.updated`        | A dispute's status changed            |
| `charge.dispute.closed`         | A dispute was resolved (won or lost)  |

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

## Event Handlers

Event handlers are defined in `src/stripe/webhooks.ts`:

### payment_intent.succeeded

Called when a payment is successful. Finds the order by `stripePaymentIntentId` and updates its status to `paid`. Notifies the linked provider via webhook if applicable.

```typescript
export const paymentIntentSucceeded = async ({ event }) => {
  const paymentIntent = event.data.object
  const { serviceId, providerId, externalId } = paymentIntent.metadata || {}

  const payload = await getPayloadClient()

  // Find order by payment intent ID
  const existingOrders = await payload.find({
    collection: 'orders',
    where: {
      stripePaymentIntentId: { equals: paymentIntent.id },
    },
    depth: 1,
  })

  if (existingOrders.docs.length > 0) {
    await payload.update({
      collection: 'orders',
      id: existingOrders.docs[0].id,
      data: { status: 'paid' },
    })
  } else if (serviceId) {
    // Create new order if it doesn't exist
    await payload.create({
      collection: 'orders',
      data: {
        service: serviceId,
        status: 'paid',
        total: paymentIntent.amount / 100,
        stripePaymentIntentId: paymentIntent.id,
        ...(providerId && { provider: providerId }),
        ...(externalId && { externalId }),
      },
    })
  }

  // Notify provider if applicable
  if (providerId) {
    // Fetch provider and send webhook notification
  }
}
```

### payment_intent.payment_failed

Called when a payment fails. Finds the order by `stripePaymentIntentId` and updates status to `failed`. Notifies the linked provider if applicable.

```typescript
export const paymentIntentFailed = async ({ event }) => {
  const paymentIntent = event.data.object
  const { providerId } = paymentIntent.metadata || {}

  const payload = await getPayloadClient()

  // Find and update order
  const existingOrders = await payload.find({
    collection: 'orders',
    where: {
      stripePaymentIntentId: { equals: paymentIntent.id },
    },
    depth: 1,
  })

  if (existingOrders.docs.length > 0) {
    await payload.update({
      collection: 'orders',
      id: existingOrders.docs[0].id,
      data: { status: 'failed' },
    })
  }
}
```

---

## Dispute Handling

The webhook handler processes three types of dispute events. All use a shared `updateOrderDisputeStatus` helper.

### How It Works

1. **Stripe sends a dispute event** (created, updated, or closed)
2. **The handler extracts the `payment_intent` ID** from the dispute object
3. **Finds the order** by matching `stripePaymentIntentId`
4. **Updates the order** with:
   - `status` → `"disputed"`
   - `disputeId` → Stripe dispute ID
   - `disputeStatus` → Mapped dispute status
   - `disputeAmount` → Amount in dollars (converted from cents)
   - `disputeReason` → Reason for the dispute

### Dispute Event Handlers

```typescript
// charge.dispute.created
export const handleDisputeCreated = async ({ event }) => {
  const dispute = event.data.object
  await updateOrderDisputeStatus(dispute)
}

// charge.dispute.updated
export const handleDisputeUpdated = async ({ event }) => {
  const dispute = event.data.object
  await updateOrderDisputeStatus(dispute)
}

// charge.dispute.closed
export const handleDisputeClosed = async ({ event }) => {
  const dispute = event.data.object
  await updateOrderDisputeStatus(dispute)
}
```

### Dispute Status Mapping

| Stripe Status            | Order `disputeStatus`    |
| ------------------------ | ------------------------ |
| `warning_needs_response` | `warning_needs_response` |
| `warning_under_review`   | `warning_under_review`   |
| `warning_closed`         | `warning_closed`         |
| `needs_response`         | `needs_response`         |
| `under_review`           | `under_review`           |
| `won`                    | `won`                    |
| `lost`                   | `lost`                   |

---

## Testing

### Test Using Stripe CLI

Trigger specific events:

```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test dispute creation
stripe trigger charge.dispute.created
```

### Test with Real Payments

1. Start your dev server
2. Start webhook forwarding: `stripe listen --forward-to http://localhost:3000/api/stripe/webhooks`
3. Go through the checkout flow using Cash App test mode
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

**Solution:** Check that the event type is listed in `STRIPE_CONFIG.webhookEvents` and has a handler in the switch statement in `src/app/api/stripe/webhooks/route.ts`.

#### "Connection refused" (Local Development)

**Cause:** Dev server not running.

**Solution:**

1. Start your dev server first: `pnpm run dev`
2. Then run: `stripe listen --forward-to http://localhost:3000/api/stripe/webhooks`

#### "No order found for disputed payment intent"

**Cause:** The dispute's payment intent doesn't match any order in the database.

**Solution:**

1. Check that the payment was processed through DZTech
2. Verify `stripePaymentIntentId` is stored on the order
3. Check the dispute object in Stripe Dashboard for the correct payment intent ID

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
stripe trigger charge.dispute.created

# View events
stripe events list --limit 10
```

### Supported Events

| Event                           | Handler                  | Action                          |
| ------------------------------- | ------------------------ | ------------------------------- |
| `payment_intent.succeeded`      | `paymentIntentSucceeded` | Updates order to "paid"         |
| `payment_intent.payment_failed` | `paymentIntentFailed`    | Updates order to "failed"       |
| `charge.dispute.created`        | `handleDisputeCreated`   | Updates order to "disputed"     |
| `charge.dispute.updated`        | `handleDisputeUpdated`   | Updates dispute status on order |
| `charge.dispute.closed`         | `handleDisputeClosed`    | Updates dispute to won/lost     |

---

## Security Best Practices

1. **Always verify webhook signatures** — Never process unverified webhooks
2. **Use HTTPS in production** — Stripe requires HTTPS for webhook endpoints
3. **Handle idempotently** — Webhooks may be sent multiple times
4. **Respond quickly** — Return 200 within 30 seconds
5. **Log events** — Keep records for debugging and auditing

---

_Documentation last updated: February 2026_
