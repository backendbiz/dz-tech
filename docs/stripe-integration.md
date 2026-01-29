# Stripe Payment Integration

> Complete guide for the custom Stripe payment integration in DZTech Consulting.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Per-Service Stripe Accounts](#per-service-stripe-accounts)
5. [Security Features](#security-features)
6. [API Reference](#api-reference)
7. [Webhook Handling](#webhook-handling)
8. [Frontend Components](#frontend-components)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This integration provides a **custom, branded checkout experience** using Stripe Payment Elements with **Cash App as the only payment method**. Key features include:

- ✅ Custom checkout UI at `/checkout` (your domain, your branding)
- ✅ **Cash App only** payments (no cards)
- ✅ Multiple Stripe accounts per service
- ✅ Encrypted API keys stored in database
- ✅ Automatic key validation before saving
- ✅ Dashboard indicators showing test/live mode
- ✅ Webhook handling for payment events

> ⚠️ **Important:** Cash App payments require a **US-based Stripe account**.

### Payment Flow

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Buy Now     │───▶│  /checkout page  │───▶│  Stripe Payment │
│  Button      │    │  (Custom UI)     │    │  Elements       │
└──────────────┘    └──────────────────┘    └─────────────────┘
                              │                       │
                              ▼                       ▼
                    ┌──────────────────┐    ┌─────────────────┐
                    │  Payment Intent  │    │  confirmPayment │
                    │  API             │    │  (Stripe.js)    │
                    └──────────────────┘    └─────────────────┘
                                                      │
                              ┌───────────────────────┘
                              ▼
                    ┌──────────────────┐    ┌─────────────────┐
                    │  /checkout/      │◀───│  Stripe Webhook │
                    │  success         │    │  /api/stripe/   │
                    └──────────────────┘    │  webhooks       │
                                            └─────────────────┘
```

---

## Architecture

### File Structure

```
src/
├── lib/
│   ├── stripe.ts              # Stripe SDK singleton & utilities
│   └── encryption.ts          # AES-256-GCM encryption for keys
│
├── hooks/
│   └── stripeKeyHooks.ts      # Validation & encryption hooks
│
├── stripe/
│   └── webhooks.ts            # Webhook event handlers
│
├── app/
│   ├── api/
│   │   ├── create-payment-intent/
│   │   │   └── route.ts       # Create Payment Intent
│   │   └── stripe/
│   │       └── webhooks/
│   │           └── route.ts   # Webhook endpoint
│   │
│   └── (frontend)/
│       └── checkout/
│           ├── page.tsx           # Checkout page
│           ├── CheckoutClient.tsx # Checkout logic
│           └── success/
│               ├── page.tsx       # Success page
│               └── SuccessClient.tsx
│
├── components/
│   └── checkout/
│       ├── StripeProvider.tsx     # Stripe Elements provider
│       ├── PaymentForm.tsx        # Payment form component
│       └── CashAppPaymentForm.tsx # Cash App specific form
│
└── collections/
    └── Services.ts            # Service collection with Stripe config
```

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Default Stripe Account
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Optional: Dedicated encryption key (otherwise uses PAYLOAD_SECRET)
STRIPE_ENCRYPTION_KEY=your-32-character-encryption-key
```

### Stripe Dashboard Setup

1. **Create a webhook endpoint** in Stripe Dashboard:
   - URL: `https://your-domain.com/api/stripe/webhooks`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

2. **Copy the webhook signing secret** (`whsec_...`) to your `.env`

---

## Per-Service Stripe Accounts

Each service can have its own Stripe account for receiving payments directly.

### Admin Panel Setup

1. Go to **Admin** → **Services** → **Edit a service**
2. Scroll to **Stripe Configuration**
3. Enable **Use Custom Stripe Account**
4. Enter your keys:

| Field           | Format                         | Example               |
| --------------- | ------------------------------ | --------------------- |
| Secret Key      | `sk_test_...` or `sk_live_...` | `sk_test_51ABC123...` |
| Publishable Key | `pk_test_...` or `pk_live_...` | `pk_test_51ABC123...` |
| Webhook Secret  | `whsec_...`                    | `whsec_abc123...`     |

### What Happens on Save

1. **Format Validation** — Keys must match expected patterns
2. **Mode Validation** — Both keys must be test OR both must be live
3. **API Validation** — Calls `stripe.accounts.retrieve()` to verify key works
4. **Encryption** — Secret key and webhook secret are encrypted
5. **Mode Indicator** — Sets 🟢 Live, 🟡 Test, or ⚪ Default

### Dashboard Indicators

The Services list shows a **Stripe Mode** column:

| Icon       | Meaning                                |
| ---------- | -------------------------------------- |
| 🟢 Live    | Using live Stripe keys (real payments) |
| 🟡 Test    | Using test Stripe keys                 |
| ⚪ Default | Using default `.env` Stripe account    |

---

## Security Features

### Encryption

Sensitive keys are encrypted using **AES-256-GCM** before storing in the database.

```typescript
// What gets encrypted:
- stripeSecretKey     ✅ Encrypted
- stripeWebhookSecret ✅ Encrypted
- stripePublishableKey ❌ Not encrypted (already public)
```

### Encryption Details

| Property       | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Algorithm      | AES-256-GCM                                            |
| Key Derivation | SHA-256 of `STRIPE_ENCRYPTION_KEY` or `PAYLOAD_SECRET` |
| IV             | 16 random bytes per encryption                         |
| Auth Tag       | 16 bytes (integrity verification)                      |
| Output         | Base64 string                                          |

### Key Validation

Before saving, the system validates:

1. **Key format** — Must match Stripe patterns
2. **Mode consistency** — Both keys same mode (test/live)
3. **API verification** — Actually calls Stripe to test the key

---

## API Reference

### POST `/api/create-payment-intent`

Creates a Payment Intent for the checkout flow.

**Request Body:**

```json
{
  "serviceId": "6970fe425827052b...",
  "orderId": "ORD-20260129-123456-ABC123" // Optional
}
```

**Response:**

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "orderId": "ORD-20260129-123456-ABC123",
  "amount": 2000,
  "serviceName": "Web Development",
  "stripePublishableKey": "pk_test_xxx..."
}
```

### POST `/api/stripe/webhooks`

Handles incoming Stripe webhook events.

**Headers:**

- `stripe-signature`: Signature from Stripe

**Handled Events:**

- `checkout.session.completed` — Order marked as paid
- `payment_intent.succeeded` — Order marked as paid
- `payment_intent.payment_failed` — Order marked as failed

---

## Webhook Handling

### Event Handlers

Located in `src/stripe/webhooks.ts`:

```typescript
// Called when payment succeeds
export const paymentIntentSucceeded = async ({ event }) => {
  // Updates order status to 'paid'
}

// Called when payment fails
export const paymentIntentFailed = async ({ event }) => {
  // Updates order status to 'failed'
}

// Called for checkout session completion
export const checkoutSessionCompleted = async ({ event }) => {
  // Creates/updates order
}
```

### Multi-Account Webhook Verification

The webhook endpoint automatically:

1. Fetches all webhook secrets (default + per-service)
2. Tries to verify signature with each secret
3. Processes event with first successful verification

---

## Frontend Components

### StripeProvider

Wraps payment forms with Stripe Elements context.

```tsx
import { StripeProvider } from '@/components/checkout/StripeProvider'
;<StripeProvider
  clientSecret={paymentData.clientSecret}
  publishableKey={paymentData.stripePublishableKey} // Per-service key
>
  <PaymentForm />
</StripeProvider>
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

### CashAppPaymentForm

Specialized form for Cash App payments.

```tsx
import { CashAppPaymentForm } from '@/components/checkout/CashAppPaymentForm'
;<CashAppPaymentForm orderId="ORD-123" amount={2000} />
```

---

## Troubleshooting

### Common Issues

#### "Invalid Stripe secret key format"

**Cause:** Key doesn't match expected pattern
**Solution:** Ensure key starts with `sk_test_` or `sk_live_`

#### "Secret key and publishable key mode mismatch"

**Cause:** One key is test, the other is live
**Solution:** Use both test keys OR both live keys

#### "Invalid Stripe secret key: Invalid API Key provided"

**Cause:** Key is malformed or revoked
**Solution:** Generate a new key in Stripe Dashboard

#### Webhook signature verification failed

**Cause:** Wrong webhook secret
**Solution:**

1. Check the webhook secret in Stripe Dashboard
2. Ensure it's copied correctly to `.env` or service config
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
console.log('Using Stripe account:', stripeCredentials.secretKey.slice(-4))
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

## Migration Notes

### From Stripe Plugin to Custom Integration

If you previously used `@payloadcms/plugin-stripe`:

1. ✅ Plugin removed from `payload.config.ts`
2. ✅ Custom webhook endpoint created at `/api/stripe/webhooks`
3. ✅ Same webhook events handled
4. ⚠️ Update Stripe Dashboard webhook URL if needed

### Database Changes

The Services collection now includes:

```typescript
stripeConfig: {
  useCustomStripeAccount: boolean
  stripeSecretKey: string // Encrypted
  stripePublishableKey: string // Plain text (public key)
  stripeWebhookSecret: string // Encrypted
  stripeKeyMode: 'test' | 'live' | 'unknown'
}
```

Run Payload type generation after changes:

```bash
pnpm payload generate:types
```

---

## Support

For issues with this integration:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Stripe Dashboard logs
3. Check server logs for detailed error messages
4. Verify all environment variables are set correctly

---

_Documentation last updated: January 2026_
