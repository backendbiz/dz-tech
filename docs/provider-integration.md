# Provider Integration Guide

This document explains how external providers can integrate with DZTech to process payments through our unified checkout system.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   Provider A                               Provider B                        │
│   API Key: provider_xxx...                 API Key: provider_yyy...          │
│        │                                        │                            │
│        ▼                                        ▼                            │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │              dztech.shop/api/create-payment-intent                  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│        │                                        │                            │
│        ▼                                        ▼                            │
│   ┌─────────────────────┐              ┌─────────────────────┐              │
│   │ Service A           │              │ Service B           │              │
│   │ $5/unit             │              │ $300/project        │              │
│   └─────────────────────┘              └─────────────────────┘              │
│        │                                        │                            │
│        ▼                                        ▼                            │
│   ┌──────────────────────────────────────────────────────────┐              │
│   │           DZTech Stripe Account (Cash App Pay)           │              │
│   └──────────────────────────────────────────────────────────┘              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Each provider:

- Has their **own API key** for authentication
- Links to a specific **Service** (product/pricing)
- Can specify custom **amount** (quantity-based pricing)
- Receives **webhook notifications** when payments complete
- Has **custom redirect URLs** for their users after payment

---

## Integration Flows

### Flow 1: API-Based Integration (Recommended for Providers)

```
Provider Backend                DZTech                      User
      │                            │                          │
      │  POST /api/create-payment-intent                      │
      │  { apiKey, externalId, amount }                       │
      │ ──────────────────────────►│                          │
      │                            │                          │
      │  { checkoutUrl, orderId }  │                          │
      │ ◄──────────────────────────│                          │
      │                            │                          │
      │  Redirect user ───────────────────────────────────────►│
      │                            │                          │
      │                            │  /checkout/o/[token]     │
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

### Flow 2: Direct Service Checkout (Buy Button)

```
User clicks "Buy Now" on DZTech Service Page
      │
      ▼
POST /api/create-payment-intent { serviceId }
      │
      ▼
Redirect to /checkout/o/{checkoutToken}
      │
      ▼
User pays via Cash App → Same Page (Success/Failed UI)
```

---

## Setting Up a Provider

### Step 1: Create a Service

1. Go to **Admin Panel** → **Services**
2. Create a new service with:
   - **Title**: Product name (e.g., "Premium Credits")
   - **Price**: Unit price (e.g., $5)
   - **Slug**: URL-friendly identifier

3. **Save** the service

### Step 2: Create the Provider

1. Go to **Admin Panel** → **Providers**
2. Click **Create New Provider**
3. Fill in:

| Field                    | Example                                           | Description                         |
| ------------------------ | ------------------------------------------------- | ----------------------------------- |
| **Provider Name**        | Bitloader                                         | Display name                        |
| **Provider Slug**        | `bitloader`                                       | URL-friendly identifier             |
| **Linked Service**       | Premium Credits                                   | Service this provider sells         |
| **Status**               | 🟢 Active                                         | Enable/disable the provider         |
| **Webhook URL**          | `https://bitloader.com/api/webhooks/dztech`       | Where to send payment notifications |
| **Success Redirect URL** | `https://bitloader.com/success?orderId={orderId}` | Redirect after successful payment   |
| **Cancel Redirect URL**  | `https://bitloader.com/cancelled`                 | Redirect after cancelled payment    |

4. **Save** → Copy the auto-generated **API Key**

> **Note**: Use `{orderId}` as a placeholder in redirect URLs - it will be replaced with the actual order ID.

---

## API Reference

### POST /api/create-payment-intent

Creates a payment session and returns a secure checkout URL.

**Request Body**:

```json
{
  "apiKey": "provider_xxxxxxxxxxxxxxxxxxxx",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "amount": 100
}
```

| Field        | Required    | Description                                       |
| ------------ | ----------- | ------------------------------------------------- |
| `apiKey`     | Yes         | Your provider API key                             |
| `externalId` | Recommended | Your internal order/transaction ID for tracking   |
| `amount`     | No          | Custom amount (must be multiple of service price) |

**Amount & Quantity Logic**:

- If `amount` is provided:
  - Must be **≥ service price**
  - Must be **divisible by service price**
  - **Quantity** = `amount / servicePrice`
  - Example: Service Price = $5, Amount = $100 → Quantity = 20

- If `amount` is NOT provided:
  - Uses default **service price**
  - **Quantity** = 1

**Success Response** (200):

```json
{
  "checkoutUrl": "https://dztech.shop/checkout/o/tok_123...",
  "orderId": "65b...",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "amount": 100
}
```

> **Note**: The `checkoutUrl` uses a secure, unguessable checkout token. Redirect your users to this URL to complete payment.

**Error Responses**:

| Status | Error                                    | Description                       |
| ------ | ---------------------------------------- | --------------------------------- |
| 401    | Invalid or inactive API key              | Check API key and provider status |
| 400    | Amount must be a multiple of 5           | Amount validation failed          |
| 400    | Amount cannot be less than service price | Minimum amount not met            |
| 400    | Cash App payments are not available      | Stripe account issue              |
| 500    | Server error                             | Contact support                   |

---

## Checkout Flow

### What Users See

1. **Checkout Page** (`/checkout/o/[token]`)
   - Order ID displayed
   - Amount to pay
   - Cash App payment button

2. **Cash App Opens** (in new tab/window)
   - User approves payment in Cash App

3. **Returns to Checkout Page**
   - **Success**: Green success UI with order confirmation
   - **Failed**: Red error UI with "Try Again" button
   - **Processing**: Blue processing UI

4. **Provider Redirect** (if configured)
   - 5-second countdown shown
   - Auto-redirects to provider's `successRedirectUrl`
   - User can click to redirect immediately

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
  "providerName": "Bitloader",
  "serviceId": "abc123",
  "serviceName": "Premium Credits",
  "amount": 100,
  "status": "paid",
  "stripePaymentIntentId": "pi_xxx",
  "timestamp": "2026-01-30T10:00:00.000Z"
}
```

### Payment Failed

```json
{
  "event": "payment_failed",
  "orderId": "65b...",
  "externalId": "YOUR-INTERNAL-ORDER-ID",
  "providerId": "xyz789",
  "providerName": "Bitloader",
  "serviceId": "abc123",
  "serviceName": "Premium Credits",
  "amount": 100,
  "status": "failed",
  "stripePaymentIntentId": "pi_xxx",
  "timestamp": "2026-01-30T10:00:00.000Z"
}
```

> **Important**: Use the `externalId` field to match webhook notifications with your internal orders.

### Webhook Retry Logic

DZTech uses **exponential backoff** for webhook delivery:

| Attempt | Delay     |
| ------- | --------- |
| 1       | Immediate |
| 2       | 1 second  |
| 3       | 2 seconds |
| 4       | 4 seconds |
| 5       | 8 seconds |

If all 5 attempts fail, the webhook is logged for manual replay.

---

## Complete Integration Example

### Provider Backend (Node.js)

```javascript
// provider-backend/services/payment.js

const DZTECH_API_KEY = process.env.DZTECH_API_KEY

async function createPaymentSession(userId, quantity) {
  // Generate a unique external ID for tracking
  const externalId = `ORDER-${userId}-${Date.now()}`

  // Calculate amount (e.g., $5 per unit)
  const amount = quantity * 5

  const response = await fetch('https://dztech.shop/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: DZTECH_API_KEY,
      externalId,
      amount,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create payment session')
  }

  const data = await response.json()

  // Store order in your database
  await db.orders.create({
    id: externalId,
    userId,
    quantity,
    amount: data.amount,
    dztechOrderId: data.orderId,
    status: 'pending',
    createdAt: new Date(),
  })

  return {
    checkoutUrl: data.checkoutUrl,
    orderId: data.orderId,
    externalId,
  }
}

module.exports = { createPaymentSession }
```

### Provider Frontend

```javascript
// provider-frontend/components/BuyButton.jsx

async function handleBuy(quantity) {
  try {
    const response = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    })

    const { checkoutUrl } = await response.json()

    // Redirect to DZTech checkout (token-based URL)
    window.location.href = checkoutUrl
  } catch (error) {
    console.error('Payment error:', error)
    alert('Failed to start payment. Please try again.')
  }
}
```

### Provider Webhook Handler

```javascript
// provider-backend/routes/webhooks.js

app.post('/api/webhooks/dztech', async (req, res) => {
  // Verify webhook source
  if (req.headers['x-dztech-webhook'] !== 'payment-notification') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { event, externalId, amount, status } = req.body

  console.log(`Received ${event} for order ${externalId}`)

  // Find order using YOUR externalId
  const order = await db.orders.findById(externalId)

  if (!order) {
    console.error(`Order not found: ${externalId}`)
    return res.status(200).json({ received: true })
  }

  if (event === 'payment_succeeded') {
    await db.orders.update(order.id, {
      status: 'paid',
      paidAt: new Date(),
    })

    // Grant credits/access to user
    await grantCredits(order.userId, quantity)

    // Send confirmation
    await sendConfirmationEmail(order.userId, { amount })
  } else if (event === 'payment_failed') {
    await db.orders.update(order.id, { status: 'failed' })
    await sendFailureNotification(order.userId)
  }

  // Always respond 200 to acknowledge receipt
  res.status(200).json({ received: true })
})
```

### Provider Success Page

```javascript
// provider-frontend/pages/success.jsx

export default function SuccessPage() {
  const router = useRouter()
  const { orderId } = router.query

  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Order Reference: {orderId}</p>
      <p>Your credits have been added to your account.</p>
      <a href="/dashboard">Go to Dashboard</a>
    </div>
  )
}
```

---

## Tracking in Stripe Dashboard

Payments made through DZTech include helpful metadata visible in Stripe:

| Metadata Field  | Description                            |
| --------------- | -------------------------------------- |
| `serviceId`     | DZTech service ID                      |
| `serviceName`   | Service name (e.g., "Premium Credits") |
| `quantity`      | Number of units purchased              |
| `providerId`    | Provider's ID (if applicable)          |
| `providerName`  | Provider's name (if applicable)        |
| `externalId`    | Provider's internal order ID           |
| `paymentLinkId` | Stripe Payment Link ID (if used)       |

**Payment Description Format**:

- With Payment Link: `Premium Credits | PaymentLink: plink_xxx`
- Direct/API: `Premium Credits | Direct`
- With Provider: `Premium Credits | Direct (Bitloader)`

---

## Security Considerations

1. **API Key Protection**: Never expose your API key in frontend code
2. **Webhook Verification**: Always check the `X-DZTech-Webhook` header
3. **HTTPS Only**: All API calls must be over HTTPS
4. **Idempotency**: Handle duplicate webhook notifications gracefully
5. **Order Verification**: Wait for webhook before granting access (don't trust client)
6. **Checkout Tokens**: Checkout URLs use cryptographically secure 128-bit tokens, preventing URL guessing

---

## Testing

### Test with cURL

```bash
# Create payment session
curl -X POST https://dztech.shop/api/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_PROVIDER_API_KEY",
    "externalId": "TEST-ORDER-001",
    "amount": 25
  }'
```

### Stripe Test Mode

Use Stripe's test mode credentials. For Cash App testing:

- Use `$test_cashtag` in the Cash App sandbox
- All test payments will succeed

---

## Troubleshooting

| Issue                            | Solution                                        |
| -------------------------------- | ----------------------------------------------- |
| "Invalid or inactive API key"    | Check API key, verify provider status is Active |
| "Amount must be a multiple of 5" | Ensure amount is divisible by service price     |
| "Cash App not available"         | Requires US-based Stripe account                |
| Webhook not received             | Check URL is publicly accessible, responds 200  |
| User not redirected              | Verify `successRedirectUrl` has `{orderId}`     |
| Duplicate webhooks               | Implement idempotency using `externalId`        |

---

## Support

For integration support, contact: support@dztech.shop

---

_Documentation last updated: February 2026_
