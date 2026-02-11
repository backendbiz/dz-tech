# Stripe Payment Integration

> Complete guide for the custom Stripe payment integration in DZTech Consulting.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Security Features](#security-features)
5. [API Reference](#api-reference)
6. [Webhook Handling](#webhook-handling)
7. [Dispute Handling](#dispute-handling)
8. [Frontend Components](#frontend-components)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This integration provides a **custom, branded checkout experience** using Stripe Payment Elements with **Cash App as the only payment method**. Key features include:

- ✅ Custom checkout UI at `/checkout` (your domain, your branding)
- ✅ **Cash App only** payments (via Stripe)
- ✅ Secure API Key authentication for Providers
- ✅ Dashboard indicators showing dispute status
- ✅ Webhook handling for payment events

> ⚠️ **Important:** Cash App payments require a **US-based Stripe account**.

### Payment Flow

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Buy Now     │───▶│  /checkout/o/    │───▶│  Stripe Payment │
│  Button      │    │  {token}         │    │  Elements       │
└──────────────┘    │  (Custom UI)     │    └─────────────────┘
                    └──────────────────┘              │
                              │                       ▼
                    ┌──────────────────┐    ┌─────────────────┐
                    │  Payment Intent  │    │  confirmPayment │
                    │  API             │    │  (Stripe.js)    │
                    └──────────────────┘    └─────────────────┘
                                                      │
                              ┌────────────────────────┘
                              ▼
                    ┌──────────────────┐    ┌─────────────────┐
                    │  /checkout/o/    │◀───│  Stripe Webhook │
                    │  {token} (same   │    │  /api/stripe/   │
                    │  page result)    │    │  webhooks       │
                    └──────────────────┘    └─────────────────┘
```

---

## Architecture

### File Structure

```
src/
├── lib/
│   ├── stripe.ts                  # Stripe SDK singleton & utilities
│   ├── encryption.ts              # AES-256-GCM encryption for keys
│   ├── checkout-token.ts          # Secure checkout token generation
│   ├── order-generator.ts         # Order ID generation (ORD-xxx)
│   └── api-key.ts                 # Provider API key utilities
│
├── stripe/
│   └── webhooks.ts                # Webhook event handlers
│
├── app/
│   ├── api/
│   │   ├── create-payment-intent/
│   │   │   └── route.ts           # Create Payment Intent + Order
│   │   ├── checkout-session/
│   │   │   └── [token]/
│   │   │       └── route.ts       # Resolve checkout token → session data
│   │   └── stripe/
│   │       └── webhooks/
│   │           └── route.ts       # Webhook endpoint
│   │
│   └── (app-checkout)/
│       ├── layout.tsx             # Checkout layout
│       ├── checkout/
│       │   ├── page.tsx           # Legacy checkout page
│       │   └── o/
│       │       └── [token]/
│       │           └── page.tsx   # Token-based checkout page (primary)
│       └── payment-standalone/
│           └── page.tsx           # Standalone payment page
│
├── components/
│   └── checkout/
│       ├── StripeProvider.tsx      # Stripe Elements provider
│       ├── CheckoutTokenClient.tsx # Token-based checkout (primary)
│       ├── CheckoutClient.tsx      # Legacy checkout (query params)
│       ├── PaymentForm.tsx         # Generic payment form
│       └── CashAppPaymentForm.tsx  # Cash App specific form
│
└── collections/
    ├── Services.ts                # Service collection
    ├── Orders.ts                  # Orders collection
    └── Providers.ts               # Providers collection
```

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Stripe Account
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Site URL (for constructing checkout URLs)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Optional: Dedicated encryption key (otherwise uses PAYLOAD_SECRET)
STRIPE_ENCRYPTION_KEY=your-32-character-encryption-key
```

## Configuration

---

## Security Features

### Checkout Token Security

Checkout URLs use **cryptographically secure tokens** instead of exposing internal IDs:

| Property     | Value                                    |
| ------------ | ---------------------------------------- |
| Token Format | 32-character hex string                  |
| Entropy      | 128 bits (16 random bytes)               |
| Generation   | `crypto.randomBytes(16).toString('hex')` |
| Validation   | `/^[a-f0-9]{32}$/`                       |
| Storage      | Unique indexed field on Order document   |

**Example URL**: `https://app.dztech.shop/checkout/o/caa36d0b5aed3f52d2eab944d5b1bdb5`

### Encryption

Sensitive keys are encrypted using **AES-256-GCM** before storing in the database.

---

## API Reference

### POST `/api/create-payment-intent`

Creates a Payment Intent and pending Order. Returns a secure checkout URL.

**Request Body (Direct / Frontend):**

```json
{
  "serviceId": "6970fe425827052b..."
}
```

**Request Body (Provider / API Key):**

```json
{
  "apiKey": "provider_xxxxxxxxxxxxxxxxxxxx",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "amount": 100
}
```

**Response (Frontend):**

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "orderId": "65b...",
  "checkoutToken": "caa36d0b5aed3f52d2eab944d5b1bdb5",
  "checkoutUrl": "https://app.dztech.shop/checkout/o/caa36d0b5aed3f52d2eab944d5b1bdb5",
  "amount": 2000,
  "quantity": 1,
  "serviceName": "Web Development",
  "serviceId": "6970fe...",
  "stripePublishableKey": "pk_test_xxx..."
}
```

**Response (Provider via API Key):**

```json
{
  "checkoutUrl": "https://app.dztech.shop/checkout/o/caa36d0b5aed3f52d2eab944d5b1bdb5",
  "orderId": "65b...",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "amount": 100
}
```

### GET `/api/checkout-session/[token]`

Resolves a checkout token to the full checkout session data.

**Response:**

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "orderId": "65b...",
  "checkoutToken": "caa36d0b...",
  "status": "pending",
  "amount": 2000,
  "quantity": 1,
  "serviceName": "Web Development",
  "serviceId": "6970fe...",
  "stripePublishableKey": "pk_test_xxx...",
  "service": {
    "id": "6970fe...",
    "title": "Web Development",
    "description": "...",
    "price": 2000,
    "slug": "web-development"
  }
}
```

### POST `/api/stripe/webhooks`

Handles incoming Stripe webhook events.

**Headers:**

- `stripe-signature`: Signature from Stripe

**Handled Events:**

- `payment_intent.succeeded` — Order marked as paid
- `payment_intent.payment_failed` — Order marked as failed
- `charge.dispute.created` — Order marked as disputed
- `charge.dispute.updated` — Dispute status updated
- `charge.dispute.closed` — Dispute status updated (won/lost)

---

## Webhook Handling

### Event Handlers

Located in `src/stripe/webhooks.ts`:

```typescript
// Called when payment succeeds
export const paymentIntentSucceeded = async ({ event }) => {
  // Finds order by stripePaymentIntentId
  // Updates order status to 'paid'
  // Notifies provider via webhook (if applicable)
}

// Called when payment fails
export const paymentIntentFailed = async ({ event }) => {
  // Finds order by stripePaymentIntentId
  // Updates order status to 'failed'
  // Notifies provider via webhook (if applicable)
}

// Called when a dispute is created
export const handleDisputeCreated = async ({ event }) => {
  // Updates order status to 'disputed'
  // Sets disputeId, disputeStatus, disputeAmount, disputeReason
}

// Called when a dispute is updated
export const handleDisputeUpdated = async ({ event }) => {
  // Updates dispute status on the order
}

// Called when a dispute is closed
export const handleDisputeClosed = async ({ event }) => {
  // Updates dispute status to won/lost
}
```

### Webhook Verification

The webhook endpoint verifies the request signature using the `STRIPE_WEBHOOKS_ENDPOINT_SECRET` environment variable to ensure authenticity.

---

## Frontend Components

### StripeProvider

Wraps payment forms with Stripe Elements context.

```tsx
import { StripeProvider } from '@/components/checkout/StripeProvider'
;<StripeProvider
  clientSecret={paymentData.clientSecret}
  publishableKey={paymentData.stripePublishableKey}
>
  <CashAppPaymentForm />
</StripeProvider>
```

### CashAppPaymentForm

Specialized form for Cash App payments.

```tsx
import { CashAppPaymentForm } from '@/components/checkout/CashAppPaymentForm'
;<CashAppPaymentForm orderId="ORD-123" amount={2000} />
```

### PaymentForm

Generic payment form using Stripe Payment Element.

```tsx
import { PaymentForm } from '@/components/checkout/PaymentForm'
;<PaymentForm
  orderId="ORD-123"
  amount={2000}
  onSuccess={() => console.log('Paid!')}
  onError={(err) => console.error(err)}
/>
```

---

## Troubleshooting

### Common Issues

#### "Invalid checkout link"

**Cause:** Token format doesn't match expected pattern (32 hex characters)
**Solution:** Ensure the checkout URL contains a valid token

#### "Checkout session not found or expired"

**Cause:** No order exists with the given checkout token
**Solution:** Verify the order was created successfully and token was stored

#### "Cash App payments are not available for this service"

**Cause:** Stripe account is not US-based
**Solution:** Use a US-based Stripe account for Cash App payments

#### Webhook signature verification failed

**Cause:** Wrong webhook secret
**Solution:**

1. Check the webhook secret in Stripe Dashboard
2. Ensure it's copied correctly to `.env`
3. Make sure you're using the secret for the correct webhook endpoint

#### Payment form not loading

**Cause:** Missing or invalid publishable key
**Solution:**

1. Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
2. Verify the key is valid in Stripe Dashboard

### Debug Mode

Enable detailed logging by adding to your API routes:

```typescript
console.log('Payment Intent created:', paymentIntent.id)
console.log('Checkout token:', checkoutToken)
```

### Testing Cash App Payments

In **test mode**, Cash App payments work automatically:

1. Click the **Cash App Pay** button
2. A simulated Cash App flow will appear
3. Authorize the payment in the test interface
4. Payment completes successfully

> **Note:** You don't need a real Cash App account to test. Stripe provides a simulated experience in test mode.

---

## Utility Functions

### Stripe Utilities (`src/lib/stripe.ts`)

```typescript
// Get default Stripe instance
const stripe = getStripe()

// Get Stripe for specific service
const stripe = getStripeForService(secretKey)

// Get credentials for a service
const creds = getStripeCredentialsForService(service.stripeConfig)
```

### Checkout Token Utilities (`src/lib/checkout-token.ts`)

```typescript
// Generate a secure checkout token
const token = generateCheckoutToken() // e.g., "caa36d0b5aed3f52d2eab944d5b1bdb5"

// Validate a checkout token format
const isValid = isValidCheckoutToken(token) // true/false
```

### Encryption Utilities (`src/lib/encryption.ts`)

```typescript
// Encrypt a key
const encrypted = encrypt('sk_test_xxx')

// Decrypt a key
const decrypted = decrypt(encrypted)

// Check if already encrypted
const isEnc = isEncrypted(value)

// Mask for display
const masked = maskKey('sk_test_xxx') // "sk_test...xxx"
```

---

## Support

For issues with this integration:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Stripe Dashboard logs
3. Check server logs for detailed error messages
4. Verify all environment variables are set correctly

---

_Documentation last updated: February 2026_
