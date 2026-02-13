# Bitloader User Workflow

This document describes the complete payment flow from Bitloader's perspective when using DZTech as a payment gateway.

## Overview

Bitloader uses DZTech's hosted checkout to process Cash App payments. Users are redirected to DZTech's checkout page, complete payment, and are optionally redirected back to Bitloader.

---

## Complete User Workflow

### Step 1: Bitloader Creates Order

Bitloader's backend creates a payment order by calling the DZTech API.

**Request:**
```bash
POST /api/v1/create-payment-intent
Content-Type: application/json

{
  "apiKey": "dzt_xxxxxxxxxxxxxxxxxxxx",
  "externalId": "BL-ORDER-12345",
  "amount": 100
}
```

**Response:**
```json
{
  "checkoutUrl": "https://app.dztech.shop/checkout/o/abc123def456...",
  "orderId": "698c4d780c1e43542bab7aa9",
  "externalId": "BL-ORDER-12345",
  "amount": 100
}
```

**Bitloader Actions:**
1. Save `orderId` for tracking
2. Redirect user to `checkoutUrl`

---

### Step 2: User Lands on DZTech Checkout Page

The user's browser loads the DZTech checkout page.

```
User Browser → https://app.dztech.shop/checkout/o/{token}
```

**What Happens:**
1. Checkout page calls `/api/checkout-session/{token}`
2. Receives order details and Stripe client secret
3. Displays Cash App payment UI

---

### Step 3: User Completes Payment

The user completes the payment using Cash App.

**Payment Flow:**
1. User scans QR code or taps Cash App button
2. User confirms payment in Cash App
3. User is redirected back to checkout page with `?redirect_status=succeeded`

---

### Step 4: Stripe Webhook Fires

Stripe sends a webhook to DZTech when the payment is confirmed.

```
Stripe → POST /api/v1/stripe/webhooks
Event: payment_intent.succeeded
```

**DZTech Server Actions:**
1. Finds order by `stripePaymentIntentId`
2. Updates order status: `pending` → `paid`
3. Notifies Bitloader via their configured `webhookUrl`

---

### Step 5: Bitloader Gets Notified

DZTech sends a webhook notification to Bitloader's configured webhook URL.

**Webhook Payload:**
```json
{
  "event": "payment_succeeded",
  "orderId": "698c4d780c1e43542bab7aa9",
  "externalId": "BL-ORDER-12345",
  "providerId": "697b16ac63a96da6315f4c2c",
  "providerName": "Bitloader",
  "serviceId": "697c28bf91a65f5472984bcc",
  "serviceName": "Staffing Services",
  "amount": 100,
  "status": "paid",
  "stripePaymentIntentId": "pi_3SzZpsPZLbzBLQyq1FPAjijl",
  "timestamp": "2026-02-11T14:30:00.000Z"
}
```

**Bitloader Actions:**
1. Receive webhook
2. Match `externalId` to their internal order
3. Fulfill the order (deliver product/service)
4. Return HTTP 200 to acknowledge receipt

---

### Step 6: User Redirected

After successful payment, the user is redirected.

**If `successRedirectUrl` is configured:**
```
User → Redirected to https://bitloader.com/success?orderId={orderId}
```

**If not configured:**
```
User → Sees "Payment Successful" on DZTech checkout page
```

---

## Visual Flow Diagram

```
┌─────────────┐    1. Create Order     ┌─────────────┐
│  Bitloader  │ ────────────────────►  │   DZTech    │
│   Backend   │ ◄────────────────────  │    API      │
└─────────────┘    checkoutUrl         └─────────────┘
       │                                      │
       │ 2. Redirect User                     │
       ▼                                      │
┌─────────────┐    3. Load Checkout    ┌─────────────┐
│    User     │ ────────────────────►  │   DZTech    │
│   Browser   │                        │  Checkout   │
└─────────────┘                        └─────────────┘
       │                                      │
       │ 4. Pay with Cash App                 │
       ▼                                      │
┌─────────────┐                               │
│   Cash App  │                               │
└─────────────┘                               │
       │                                      │
       │ 5. Payment Confirmed                 │
       ▼                                      ▼
┌─────────────┐    6. Webhook          ┌─────────────┐
│   Stripe    │ ────────────────────►  │   DZTech    │
└─────────────┘                        │   Server    │
                                       └─────────────┘
                                              │
                                              │ 7. Notify Provider
                                              ▼
                                       ┌─────────────┐
                                       │  Bitloader  │
                                       │   Webhook   │
                                       └─────────────┘
```

---

## Bitloader Configuration

These fields should be configured in the DZTech Providers admin panel.

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | ✅ Yes | Provider display name |
| `slug` | ✅ Yes | Unique identifier (e.g., `bitloader`) |
| `apiKey` | ✅ Yes | Auto-generated API key for authentication |
| `service` | ✅ Yes | Linked service for pricing |
| `status` | ✅ Yes | Must be `active` to process payments |
| `webhookUrl` | ❌ Optional | URL to receive payment notifications |
| `successRedirectUrl` | ❌ Optional | Redirect user after successful payment |
| `cancelRedirectUrl` | ❌ Optional | Redirect user if they cancel payment |

---

## Payment Failed Flow

If the payment fails, a different flow occurs:

1. **Stripe** sends `payment_intent.payment_failed` webhook
2. **DZTech** updates order status to `failed`
3. **DZTech** notifies Bitloader with `event: "payment_failed"`
4. **User** sees error message on checkout page

**Failed Payment Webhook:**
```json
{
  "event": "payment_failed",
  "orderId": "698c4d780c1e43542bab7aa9",
  "externalId": "BL-ORDER-12345",
  "providerId": "697b16ac63a96da6315f4c2c",
  "providerName": "Bitloader",
  "amount": 100,
  "status": "failed",
  "stripePaymentIntentId": "pi_3SzZpsPZLbzBLQyq1FPAjijl",
  "timestamp": "2026-02-11T14:30:00.000Z"
}
```

---

## Dispute Flow

If a customer disputes a charge:

1. **Stripe** sends `charge.dispute.created` webhook
2. **DZTech** updates order status to `disputed`
3. **DZTech** notifies Bitloader about the dispute

**Dispute Outcomes:**
- **Won** (merchant wins): Order status returns to `paid`
- **Lost** (customer wins): Order status becomes `refunded`

---

## API Reference

### Create Payment Intent

**Endpoint:** `POST /api/v1/create-payment-intent`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | ✅ Yes | Provider API key |
| `externalId` | string | ❌ Optional | Your internal order/transaction ID |
| `amount` | number | ❌ Optional | Custom amount (must be multiple of 5) |

**Response:**
| Field | Type | Description |
|-------|------|-------------|
| `checkoutUrl` | string | URL to redirect user for payment |
| `orderId` | string | DZTech order ID |
| `externalId` | string | Your external ID (if provided) |
| `amount` | number | Payment amount |

---

## Webhook Events

DZTech sends webhooks to your configured `webhookUrl` for these events:

| Event | Description |
|-------|-------------|
| `payment_succeeded` | Payment was successful |
| `payment_failed` | Payment failed |

**Webhook Headers:**
```
Content-Type: application/json
X-DZTech-Webhook: payment-notification
```

**Retry Policy:**
- Max retries: 5
- Backoff: Exponential (1s, 2s, 4s, 8s)
- Total wait time: ~30 seconds

---

## Testing

### Test with cURL

```bash
curl -X POST https://dztech.shop/api/v1/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "externalId": "TEST-ORDER-001",
    "amount": 100
  }'
```

### Test Webhook Locally

Use a tool like [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000
```

Then configure the ngrok URL as your `webhookUrl` in the DZTech admin panel.

---

## Support

For integration support, contact the DZTech team.
