# Provider Integration Guide

This document explains how external platforms can integrate with DZTech as their payment gateway. Providers are **independent of specific services** — they send payment details directly and receive a secure checkout page.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   Bitloader                          GBPay                PlayPlay           │
│   API Key: provider_xxx...           API Key: provider_yyy...               │
│   Gateway: Platform Default          Gateway: Stripe                        │
│   Credentials: ❌ (uses platform)   Credentials: ✅ (own Stripe account)  │
│        │                                  │              │                  │
│        ▼                                  ▼              ▼                  │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │              dztech.shop/api/create-payment-intent                  │    │
│   │              { apiKey, amount, itemName, gateway? }                 │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                   Payment Gateway Router                            │    │
│   │  Priority: body.gateway → provider.paymentGateway → env default    │    │
│   │                                                                      │    │
│   │  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌───────┐                  │    │
│   │  │  Stripe  │  │  PayPal  │  │Square│  │Crypto │                  │    │
│   │  │    ✅    │  │    🔜    │  │  🔜  │  │  🔜   │                  │    │
│   │  └──────────┘  └──────────┘  └──────┘  └───────┘                  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│                    ┌─────────────────────┐                                   │
│                    │  Checkout Page      │                                   │
│                    │  /checkout/o/{token}│                                   │
│                    └─────────────────────┘                                   │
│                              │                                               │
│                              ▼                                               │
│                    ┌─────────────────────┐                                   │
│                    │  Order (standalone) │  ← No service required            │
│                    └─────────────────────┘                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

- **No Service Required**: Providers don't need to link to a DZTech service. They send amount + description directly.
- **Multi-Gateway Support**: Providers can choose which payment gateway to use per-request or via admin config.
- **Per-Provider Credentials**: Providers can use their own payment gateway accounts (e.g., their own Stripe keys). Money goes directly to their account.
- **Gateway Priority**: `request body.gateway` → `provider.paymentGateway` (admin) → `PAYMENT_GATEWAY` (env default)
- **Standalone Orders**: Orders created by providers exist independently — they store `itemName` and `itemDescription` instead of a service reference.

---

## Integration Flow

```
Provider Backend                DZTech                      User
      │                            │                          │
      │  POST /api/create-payment-intent                      │
      │  { apiKey, amount, itemName,                          │
      │    externalId, gateway? }                              │
      │ ──────────────────────────►│                          │
      │                            │                          │
      │  { checkoutUrl, orderId }  │                          │
      │ ◄──────────────────────────│                          │
      │                            │                          │
      │  Redirect user ───────────────────────────────────────►│
      │                            │                          │
      │                            │  /checkout/o/{token}     │
      │                            │  Shows: amount +         │
      │                            │  item name + Cash App    │
      │                            │ ◄─────────────────────────│
      │                            │                          │
      │                            │  Cash App Payment        │
      │                            │ ◄────────────────────────►│
      │                            │                          │
      │                            │  Success/Failed UI       │
      │                            │ ─────────────────────────►│
      │                            │                          │
      │                            │  Redirect to Provider    │
      │                            │ ─────────────────────────►│
      │                            │                          │
      │  Webhook: payment_succeeded│                          │
      │ ◄──────────────────────────│                          │
```

---

## Setting Up a Provider

### In the Admin Panel

1. Go to **Admin Panel** → **Providers**
2. Click **Create New Provider**
3. Fill in:

| Field                           | Example                                       | Required | Description                                   |
| ------------------------------- | --------------------------------------------- | -------- | --------------------------------------------- |
| **Provider Name**               | GBPay                                         | ✅       | Display name                                  |
| **Provider Slug**               | `gbpay`                                       | ✅       | URL-friendly identifier                       |
| **Status**                      | 🟢 Active                                     | ✅       | Enable/disable                                |
| **Payment Gateway**             | 💳 Stripe                                     | No       | Override platform default                     |
| **Use Own Gateway Credentials** | ✅                                            | No       | Use provider's own Stripe/PayPal/etc. account |
| **Webhook URL**                 | `https://gbpay.com/api/webhooks/dztech`       | No       | Payment notifications                         |
| **Success Redirect URL**        | `https://gbpay.com/success?orderId={orderId}` | No       | Redirect after payment                        |
| **Cancel Redirect URL**         | `https://gbpay.com/cancelled`                 | No       | Redirect on cancel                            |

4. **If using own credentials**, fill in the Gateway Credentials section (fields shown depend on selected gateway):

| Field                      | Example          | Gateway | Description                               |
| -------------------------- | ---------------- | ------- | ----------------------------------------- |
| **Stripe Secret Key**      | `sk_live_xxx...` | Stripe  | Provider's secret key (encrypted at rest) |
| **Stripe Publishable Key** | `pk_live_xxx...` | Stripe  | Provider's publishable key                |
| **Stripe Webhook Secret**  | `whsec_xxx...`   | Stripe  | Provider's webhook secret (encrypted)     |
| **Square Access Token**    | `EAAAEdN...`     | Square  | Provider's Square token (encrypted)       |
| **Square Location ID**     | `LXXX...`        | Square  | Square location                           |
| **PayPal Client ID**       | `AcXXX...`       | PayPal  | PayPal client ID                          |
| **PayPal Client Secret**   | `ECXXX...`       | PayPal  | PayPal secret (encrypted)                 |

5. **Save** → Copy the auto-generated **API Key**

> **Note**: Service linking is **optional** and only needed for backwards compatibility. New providers should **not** link to a service.

---

## API Reference

### POST /api/create-payment-intent

Creates a payment and returns a secure checkout URL.

**Request Body**:

```json
{
  "apiKey": "provider_xxxxxxxxxxxxxxxxxxxx",
  "amount": 100,
  "itemName": "Premium Credits",
  "itemDescription": "100 premium credits for your account",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "gateway": "stripe"
}
```

| Field             | Required    | Description                                                                            |
| ----------------- | ----------- | -------------------------------------------------------------------------------------- |
| `apiKey`          | Yes         | Your provider API key                                                                  |
| `amount`          | Yes         | Payment amount in dollars                                                              |
| `itemName`        | No          | Name shown on checkout page (defaults to provider name)                                |
| `itemDescription` | No          | Description shown on checkout page                                                     |
| `externalId`      | Recommended | Your internal order/transaction ID for tracking                                        |
| `gateway`         | No          | Override the gateway for this request. Options: `stripe`, `square`, `paypal`, `crypto` |

**Success Response** (200):

```json
{
  "checkoutUrl": "https://app.dztech.shop/checkout/o/caa36d0b5aed3f52d2eab944d5b1bdb5",
  "orderId": "65b...",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "amount": 100
}
```

> **Note**: Redirect your users to `checkoutUrl` to complete payment.

**Error Responses**:

| Status | Error                                            | Description                                     |
| ------ | ------------------------------------------------ | ----------------------------------------------- |
| 401    | Invalid or inactive API key                      | Check API key and provider status               |
| 400    | Amount is required                               | Must provide an amount                          |
| 400    | Invalid amount provided                          | Amount must be a positive number                |
| 400    | Invalid gateway: "venmo". Available: stripe, ... | The `gateway` value is not a registered gateway |
| 400    | Cash App payments not available                  | Stripe account issue                            |
| 500    | Server error                                     | Contact support                                 |

---

## Per-Request Gateway Selection

A single provider can use **multiple gateways** by passing the `gateway` field per request:

```javascript
// User picks Cash App → route through Stripe
await fetch('/api/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify({
    apiKey: DZTECH_API_KEY,
    amount: 25,
    itemName: '100 Credits',
    gateway: 'stripe', // ← Cash App via Stripe
  }),
})

// User picks PayPal → route through PayPal
await fetch('/api/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify({
    apiKey: DZTECH_API_KEY,
    amount: 25,
    itemName: '100 Credits',
    gateway: 'paypal', // ← PayPal (when implemented)
  }),
})

// No gateway specified → uses provider's admin default → platform default
await fetch('/api/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify({
    apiKey: DZTECH_API_KEY,
    amount: 25,
    itemName: '100 Credits',
    // gateway omitted → uses default
  }),
})
```

### Gateway Priority

```
body.gateway  →  provider.paymentGateway (admin)  →  PAYMENT_GATEWAY (env)
  (per-request)       (per-provider)                    (global default)
```

---

## Per-Provider Credentials

Providers can use **their own Stripe account** (or Square, PayPal, etc.) so payments land directly in their account.

### How It Works

```
Without own credentials (default):
  GBPay  ─── $100 ───► Platform's Stripe (sk_live_PLATFORM) ─► Platform gets $100

With own credentials:
  GBPay  ─── $100 ───► GBPay's Stripe (sk_live_GBPAY)  ─► GBPay gets $100 directly
```

### Setting Up

1. In the admin panel, enable **"Use Own Gateway Credentials"** on the provider
2. Enter the provider's Stripe keys (secret key, publishable key, webhook secret)
3. All keys are **encrypted at rest** with AES-256-GCM
4. The key mode (test/live) is auto-detected from the publishable key

### Security

| Aspect               | Detail                                                    |
| -------------------- | --------------------------------------------------------- |
| **Encryption**       | AES-256-GCM with random IV per encryption                 |
| **Key Derivation**   | SHA-256 of `STRIPE_ENCRYPTION_KEY` or `PAYLOAD_SECRET`    |
| **Secret Keys**      | Encrypted before saving to database                       |
| **Publishable Keys** | Stored in plain text (they're meant to be public)         |
| **Decryption**       | Automatic via `afterRead` hook — available in-memory only |
| **Admin Display**    | Masked display (`sk_live...1234`)                         |

---

## Checkout Page

### What Users See

When a user opens the checkout URL, they see:

1. **Item Name** (if provided) — e.g., "Premium Credits"
2. **Item Description** (if provided)
3. **Order ID** — for reference
4. **Total Amount** — e.g., "USD 100.00"
5. **Cash App Pay Button** — to complete payment

After payment:

- **Success**: Green confirmation with order reference + provider redirect (5s countdown)
- **Failed**: Red error with "Try Again" button
- **Processing**: Blue processing message

> **Note**: The checkout page does NOT show service details or a "Back to Service" link for provider-initiated orders.

---

## Webhook Notifications

If a **Webhook URL** is configured, DZTech sends POST requests when payment status changes.

### Payment Success

```http
POST https://your-provider.com/api/webhooks/dztech
Content-Type: application/json
X-DZTech-Webhook: payment-notification

{
  "event": "payment_succeeded",
  "orderId": "65b...",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "providerId": "xyz789",
  "providerName": "GBPay",
  "itemName": "Premium Credits",
  "amount": 100,
  "status": "paid",
  "stripePaymentIntentId": "pi_xxx",
  "gatewayPaymentId": "pi_xxx",
  "paymentGateway": "stripe",
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

### Payment Failed

```json
{
  "event": "payment_failed",
  "orderId": "65b...",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "providerId": "xyz789",
  "providerName": "GBPay",
  "itemName": "Premium Credits",
  "amount": 100,
  "status": "failed",
  "stripePaymentIntentId": "pi_xxx",
  "gatewayPaymentId": "pi_xxx",
  "paymentGateway": "stripe",
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

### Webhook Fields

| Field                   | Description                                   |
| ----------------------- | --------------------------------------------- |
| `event`                 | `payment_succeeded` or `payment_failed`       |
| `orderId`               | DZTech internal order ID                      |
| `externalId`            | Your internal ID (if provided)                |
| `providerId`            | Your provider ID                              |
| `providerName`          | Your provider name                            |
| `itemName`              | Item name from the payment request            |
| `amount`                | Payment amount in dollars                     |
| `status`                | Order status (`paid`, `failed`)               |
| `stripePaymentIntentId` | Stripe-specific payment ID                    |
| `gatewayPaymentId`      | Gateway-agnostic payment ID                   |
| `paymentGateway`        | Which gateway processed this (`stripe`, etc.) |
| `timestamp`             | Event timestamp (ISO 8601)                    |

> **Note**: `gatewayPaymentId` and `paymentGateway` are gateway-agnostic fields. When Square is added, `gatewayPaymentId` will contain the Square payment ID.

### Retry Logic

DZTech uses **exponential backoff** for webhook delivery:

| Attempt | Delay     |
| ------- | --------- |
| 1       | Immediate |
| 2       | 1 second  |
| 3       | 2 seconds |
| 4       | 4 seconds |
| 5       | 8 seconds |

---

## Complete Integration Example

### Provider Backend (Node.js)

```javascript
const DZTECH_API_KEY = process.env.DZTECH_API_KEY

async function createPaymentSession(userId, amount, itemName, gateway) {
  const externalId = `ORDER-${userId}-${Date.now()}`

  const response = await fetch('https://dztech.shop/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: DZTECH_API_KEY,
      amount,
      itemName,
      externalId,
      // Optional: specify a gateway per transaction
      ...(gateway && { gateway }),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create payment session')
  }

  const data = await response.json()

  // Store in your database
  await db.orders.create({
    id: externalId,
    userId,
    amount: data.amount,
    dztechOrderId: data.orderId,
    status: 'pending',
  })

  return {
    checkoutUrl: data.checkoutUrl,
    orderId: data.orderId,
  }
}
```

### Provider Webhook Handler

```javascript
app.post('/api/webhooks/dztech', async (req, res) => {
  if (req.headers['x-dztech-webhook'] !== 'payment-notification') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { event, externalId, amount } = req.body

  const order = await db.orders.findById(externalId)
  if (!order) {
    return res.status(200).json({ received: true })
  }

  if (event === 'payment_succeeded') {
    await db.orders.update(order.id, { status: 'paid' })
    await grantAccess(order.userId, amount)
  } else if (event === 'payment_failed') {
    await db.orders.update(order.id, { status: 'failed' })
  }

  res.status(200).json({ received: true })
})
```

---

## Payment Gateway Configuration

### Global Default

The platform-wide default gateway is set via environment variable:

```bash
# .env
PAYMENT_GATEWAY=stripe  # Options: 'stripe' | 'square' | 'paypal' | 'crypto'
```

### Per-Provider Override (Admin Panel)

Each provider can optionally override the default gateway in the admin panel:

| Setting             | Behavior                                              |
| ------------------- | ----------------------------------------------------- |
| 🌐 Platform Default | Uses the global `PAYMENT_GATEWAY` env var setting     |
| 💳 Stripe           | Forces Stripe (Cash App Pay) for this provider        |
| 🟩 Square           | Forces Square for this provider (when implemented)    |
| 🅿️ PayPal           | Forces PayPal for this provider (when implemented)    |
| ₿ Cryptocurrency    | Forces crypto payments for this provider (when ready) |

### Per-Request Override (API)

Each API request can override the gateway for that specific transaction:

```json
{
  "apiKey": "provider_xxx",
  "amount": 25,
  "gateway": "stripe"
}
```

### Three Levels of Control

| Level                | Who sets it          | When to use                                                 |
| -------------------- | -------------------- | ----------------------------------------------------------- |
| **Platform default** | Platform admin (env) | `PAYMENT_GATEWAY=stripe` — all providers use Stripe         |
| **Provider default** | Admin panel          | GBPay always uses PayPal — set in admin sidebar             |
| **Per-request**      | Provider's code      | `gateway: "stripe"` — this specific transaction uses Stripe |

### Registered Gateways

| Gateway    | Status         | Payment Methods                       | Required Env Vars (Platform-level)                                               |
| ---------- | -------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| **Stripe** | ✅ Active      | Cash App Pay                          | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                        |
| **Square** | 🔜 Placeholder | Card, Apple Pay, Google Pay, Cash App | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `NEXT_PUBLIC_SQUARE_APPLICATION_ID` |
| **PayPal** | 🔜 Placeholder | PayPal, Venmo, Card, Pay Later        | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`       |
| **Crypto** | 🔜 Placeholder | Bitcoin, Ethereum, USDC, USDT         | `CRYPTO_GATEWAY_API_KEY`, `NEXT_PUBLIC_CRYPTO_GATEWAY_KEY`                       |

> **Note**: When a provider uses their **own credentials**, the platform-level env vars are not required for that provider. The provider's encrypted keys are used instead.

### Gateway Status API

Check available gateways at runtime:

```http
GET /api/payment-gateways
```

```json
{
  "defaultGateway": "stripe",
  "gateways": [
    {
      "name": "stripe",
      "displayName": "Stripe (Cash App Pay)",
      "isActive": true,
      "supportedMethods": ["cashapp"],
      "isDefault": true
    },
    {
      "name": "square",
      "displayName": "Square",
      "isActive": false,
      "supportedMethods": ["card", "apple_pay", "google_pay", "cash_app"],
      "isDefault": false
    },
    {
      "name": "paypal",
      "displayName": "PayPal",
      "isActive": false,
      "supportedMethods": ["paypal", "venmo", "card", "pay_later"],
      "isDefault": false
    },
    {
      "name": "crypto",
      "displayName": "Cryptocurrency",
      "isActive": false,
      "supportedMethods": ["bitcoin", "ethereum", "usdc", "usdt"],
      "isDefault": false
    }
  ]
}
```

### Gateway Abstraction

The system uses a `PaymentGateway` interface (`src/lib/payment-gateway.ts`) that all gateways implement:

```typescript
interface PaymentGateway {
  name: GatewayName // 'stripe', 'square', 'paypal', 'crypto'
  displayName: string // Human-readable name
  isActive: boolean // Whether this gateway is implemented

  createPayment(params) // Create a payment (accepts credentials)
  retrievePayment(id) // Get payment status
  cancelPayment(id) // Cancel a payment
  refundPayment(params) // Refund a payment
  getPublishableKey(creds?) // Frontend key (supports provider creds)
  getInfo() // Gateway metadata
  isConfigured() // Check env vars are set
}
```

### Adding a New Gateway

1. Create a class in `src/lib/payment-gateway.ts` implementing `PaymentGateway`
2. Register it in the `gatewayRegistry` map
3. Add the option to `Providers.paymentGateway` select field
4. Add credential fields to `Providers.gatewayCredentials` group
5. Set required env vars
6. Set `isActive = true`
7. No other code changes needed — the provider API and checkout flow work automatically

---

## Provider Credential Scenarios

### Scenario 1: Bitloader (uses platform's Stripe)

```
Admin Config:
  Payment Gateway: 🌐 Platform Default
  Use Own Credentials: ❌

API Call:
  { apiKey: "provider_bit...", amount: 50, itemName: "Credits" }

Result:
  Payment created on PLATFORM's Stripe account (sk_live_PLATFORM)
  Money lands in platform's account
```

### Scenario 2: GBPay (uses their own Stripe)

```
Admin Config:
  Payment Gateway: 💳 Stripe
  Use Own Credentials: ✅
  Stripe Secret Key: sk_live_GBPAY... (encrypted)
  Stripe Publishable Key: pk_live_GBPAY...

API Call:
  { apiKey: "provider_gbp...", amount: 100, itemName: "Subscription" }

Result:
  Payment created on GBPAY's Stripe account (sk_live_GBPAY)
  Money lands in GBPay's account directly
```

### Scenario 3: PlayPlay (uses own Stripe + per-request override)

```
Admin Config:
  Payment Gateway: 💳 Stripe
  Use Own Credentials: ✅
  Stripe Secret Key: sk_live_PLAYPLAY... (encrypted)

API Calls:
  // Default → PlayPlay's Stripe
  { apiKey: "provider_play...", amount: 25, itemName: "Tokens" }

  // Override → PayPal (when implemented)
  { apiKey: "provider_play...", amount: 25, itemName: "Tokens", gateway: "paypal" }
```

---

## Security Considerations

1. **API Key Protection**: Never expose your API key in frontend code
2. **Webhook Verification**: Check the `X-DZTech-Webhook` header
3. **HTTPS Only**: All API calls must be over HTTPS
4. **Idempotency**: Handle duplicate webhook notifications gracefully
5. **Checkout Tokens**: URLs use 128-bit cryptographically secure tokens
6. **Order Verification**: Wait for webhook before granting access
7. **Credential Encryption**: All provider secret keys are encrypted at rest with AES-256-GCM
8. **Key Mode Detection**: Auto-detects test vs. live mode from publishable keys

---

## Troubleshooting

| Issue                           | Solution                                                  |
| ------------------------------- | --------------------------------------------------------- |
| "Invalid or inactive API key"   | Check API key, verify provider status is Active           |
| "Amount is required"            | Provider flow requires `amount` in the request            |
| "Invalid gateway: ..."          | The `gateway` value is not registered — check spelling    |
| "Cash App not available"        | Requires US-based Stripe account                          |
| "Square/PayPal not implemented" | These gateways are placeholders — use Stripe              |
| Webhook not received            | Check URL is publicly accessible, responds 200            |
| Duplicate webhooks              | Implement idempotency using `externalId`                  |
| Payment going to wrong account  | Check "Use Own Gateway Credentials" is enabled            |
| Keys not encrypting             | Ensure `STRIPE_ENCRYPTION_KEY` or `PAYLOAD_SECRET` is set |

---

_Documentation last updated: February 2026_
