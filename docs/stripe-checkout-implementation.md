# Stripe Checkout Implementation Guide

## Overview

This document describes the custom Stripe checkout implementation for DZTech. The system uses a **token-based secure checkout** that handles all payment states (form, success, failure) inline on a single page.

## Architecture

### Flow Diagram

```
User clicks "Buy" → POST /api/v1/create-payment-intent → Get checkoutToken
      │
      ▼
Redirect to /checkout/o/{checkoutToken}
      │
      ▼
GET /api/v1/checkout-session/{token} → Resolve order + Stripe PaymentIntent
      │
      ▼
Cash App Payment → Same Page (Success/Failed UI)
                         │
                         ├── Success: Green confirmation + Provider redirect
                         ├── Failed: Red error + "Try Again" button
                         └── Processing: Blue processing message
```

### Key Components

1. **BuyButton Component** (`src/components/Service/BuyButton.tsx`)
   - Calls `/api/v1/create-payment-intent` to create session
   - Redirects to secure checkout URL: `/checkout/o/[token]`

2. **Checkout Page (Legacy)** (`src/app/(app-checkout)/checkout/page.tsx`)
   - Legacy checkout page using query parameters
   - Uses `CheckoutClient` component

3. **Checkout Token Page** (`src/app/(app-checkout)/checkout/o/[token]/page.tsx`)
   - **Primary checkout page** using token-based URLs
   - Uses `CheckoutTokenClient` component
   - Token is resolved via `GET /api/v1/checkout-session/{token}`

4. **CheckoutTokenClient** (`src/components/checkout/CheckoutTokenClient.tsx`)
   - Client component with full state management
   - Fetches checkout session data via token
   - Handles Stripe redirect params to show appropriate UI
   - Verifies actual PaymentIntent status from Stripe

5. **CheckoutClient** (`src/components/checkout/CheckoutClient.tsx`)
   - Legacy client component (query-param based)
   - Still functional for backwards compatibility

6. **CashAppPaymentForm** (`src/components/checkout/CashAppPaymentForm.tsx`)
   - Stripe Elements integration for Cash App Pay
   - Returns to same checkout page after payment

7. **Create Payment Intent API** (`src/app/api/v1/create-payment-intent/route.ts`)
   - Creates Stripe PaymentIntent
   - Creates pending Order in database with a `checkoutToken`
   - Supports both `serviceId` (direct) and `apiKey` (provider) flows
   - Returns secure `checkoutUrl` with token

8. **Checkout Session API** (`src/app/api/v1/checkout-session/[token]/route.ts`)
   - Resolves a checkout token to full session data
   - Returns service details, client secret, and provider info
   - Validates token format before database lookup

9. **Webhook Handler** (`src/stripe/webhooks.ts`)
   - Handles Stripe webhook events
   - Updates order status in database
   - Sends notifications to provider webhooks
   - Handles dispute events

10. **Order ID Generator** (`src/lib/order-generator.ts`)
    - Generates unique order IDs: `ORD-YYYYMMDD-HHMMSS-XXXXX`

11. **Checkout Token Generator** (`src/lib/checkout-token.ts`)
    - Generates cryptographically secure 32-character hex tokens
    - 128 bits of entropy (16 random bytes)

## Setup Instructions

### 1. Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Site URL (for constructing checkout URLs)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### 2. Stripe Dashboard Configuration

1. **Create API Keys**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy keys to environment variables

2. **Configure Webhooks**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/v1/stripe/webhooks`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.dispute.created`
     - `charge.dispute.updated`
     - `charge.dispute.closed`
   - Copy Webhook Signing Secret to `STRIPE_WEBHOOKS_ENDPOINT_SECRET`

3. **Cash App Requirements**
   - Requires US-based Stripe account
   - Test with `$test_cashtag` in sandbox mode

### 3. Database Schema

The Orders collection includes:

| Field                 | Type         | Description                                        |
| --------------------- | ------------ | -------------------------------------------------- |
| orderId               | text         | Client order ID (ORD-XXXXXXXX-XXXXXX-XXXXX)        |
| checkoutToken         | text         | Secure token for checkout URL (unique, indexed)    |
| externalId            | text         | Provider's internal order ID                       |
| provider              | relationship | Reference to Providers collection                  |
| service               | relationship | Reference to Services collection                   |
| status                | select       | pending, paid, failed, refunded, disputed          |
| total                 | number       | Payment amount                                     |
| quantity              | number       | Number of units                                    |
| stripeSessionId       | text         | Stripe Checkout Session ID                         |
| stripePaymentIntentId | text         | Stripe Payment Intent ID                           |
| customerEmail         | email        | Customer's email from Stripe                       |
| disputeId             | text         | Stripe Dispute ID (if disputed)                    |
| disputeStatus         | select       | Dispute status (needs_response, under_review, etc) |
| disputeAmount         | number       | Amount disputed in dollars                         |
| disputeReason         | text         | Reason for dispute                                 |

## URL Structure

| URL                                                     | Description             |
| ------------------------------------------------------- | ----------------------- |
| `/checkout/o/{checkoutToken}`                           | Secure Checkout Session |
| `/checkout/o/{checkoutToken}?redirect_status=succeeded` | Success state           |
| `/checkout/o/{checkoutToken}?redirect_status=failed`    | Failed state            |

## Order ID Format

Order IDs follow this format: `ORD-YYYYMMDD-HHMMSS-XXXXX`

- **ORD**: Fixed prefix
- **YYYYMMDD**: Date (e.g., 20260130)
- **HHMMSS**: Time (e.g., 101056)
- **XXXXX**: 5-character random alphanumeric string

Example: `ORD-20260130-101056-TFHUJ`

## Payment Flow States

### 1. Initial Load

- Shows loading spinner
- Calls `GET /api/v1/checkout-session/{token}` to resolve checkout data
- Receives service details, client secret, and provider info
- Displays payment form

### 2. Payment Form

- Cash App payment button (via Stripe Elements)
- Service details and amount displayed
- User clicks to pay

### 3. Cash App Redirect

- Opens Cash App for approval
- Returns to same checkout page with `redirect_status` param

### 4. Status Verification

- Shows "Verifying payment status..." spinner
- Calls Stripe.js `retrievePaymentIntent()` to verify actual status
- Determines UI based on real PaymentIntent status

### 5. Success State

- Green success UI
- Order confirmation with copy button
- "What Happens Next" steps
- Provider redirect (if configured) with 5-second countdown

### 6. Failed State

- Red error UI
- "Try Again" button (clears params, shows form again)
- "Browse Services" link

### 7. Processing State

- Blue processing UI
- Message that payment is being processed

## Stripe Metadata

PaymentIntents include these metadata fields:

| Field                  | Value                                  |
| ---------------------- | -------------------------------------- |
| serviceId              | Service document ID                    |
| serviceName            | Service title                          |
| quantity               | Number of units                        |
| useCustomStripeAccount | "false" (always)                       |
| providerId             | Provider ID (if applicable)            |
| providerName           | Provider name (if applicable)          |
| externalId             | Provider's external ID (if applicable) |
| paymentLinkId          | Payment Link ID (if used)              |

## Payment Description

Visible in Stripe Dashboard:

| Source        | Description Format                      |
| ------------- | --------------------------------------- |
| Payment Link  | `ServiceName \| PaymentLink: plink_xxx` |
| Direct        | `ServiceName \| Direct`                 |
| With Provider | `ServiceName \| Direct (ProviderName)`  |

## Idempotency

The API uses idempotency keys to prevent duplicate PaymentIntents:

```
Priority: externalId > orderId > random

- externalId: pi_{serviceId}_{externalId}_{amount}
- orderId: pi_{serviceId}_{orderId}_{amount}
- random: pi_{serviceId}_{timestamp}_{random}
```

## File Structure

```
src/
├── app/
│   ├── (app-checkout)/
│   │   ├── checkout/
│   │   │   ├── page.tsx               # Legacy checkout page
│   │   │   └── o/
│   │   │       └── [token]/
│   │   │           └── page.tsx       # Token-based checkout page (primary)
│   │   ├── layout.tsx                 # Checkout layout
│   │   └── payment-standalone/
│   │       └── page.tsx               # Standalone payment page
│   └── api/
│       ├── checkout-session/
│       │   └── [token]/
│       │       └── route.ts           # Resolve checkout token → session data
│       ├── create-payment-intent/
│       │   └── route.ts               # Create PaymentIntent + Order
│       ├── services/
│       │   └── [id]/
│       │       └── route.ts           # Service details API
│       └── stripe/
│           └── webhooks/
│               └── route.ts           # Stripe webhooks
├── collections/
│   ├── Orders.ts                      # Orders collection
│   ├── Providers.ts                   # Providers collection
│   └── Services.ts                    # Services collection
├── components/
│   ├── checkout/
│   │   ├── CheckoutClient.tsx         # Legacy checkout component
│   │   ├── CheckoutTokenClient.tsx    # Token-based checkout component (primary)
│   │   ├── CashAppPaymentForm.tsx     # Cash App form
│   │   ├── PaymentForm.tsx            # Generic payment form
│   │   └── StripeProvider.tsx         # Stripe Elements provider
│   └── Service/
│       └── BuyButton.tsx              # Buy button component
├── lib/
│   ├── checkout-token.ts              # Checkout token generation & validation
│   ├── order-generator.ts             # Order ID utilities
│   ├── encryption.ts                  # AES-256-GCM encryption for keys
│   ├── stripe.ts                      # Stripe utilities
│   ├── api-key.ts                     # Provider API key utilities
│   └── payload.ts                     # Payload client
└── stripe/
    └── webhooks.ts                    # Webhook handlers
```

## Testing Checklist

- [ ] Buy button creates payment intent and receives checkout token
- [ ] Token-based checkout page loads correctly
- [ ] Cash App payment opens correctly
- [ ] Success UI shows after successful payment
- [ ] Failed UI shows after failed payment
- [ ] Provider redirect works with countdown
- [ ] Webhook updates order status in database
- [ ] Dispute events update order with dispute details
- [ ] Duplicate requests use same PaymentIntent (idempotency)
- [ ] Invalid tokens return 400 error
- [ ] Expired/missing tokens return 404 error

## Security Considerations

1. **Webhook Signature Verification**: All webhooks verified with signing secret
2. **Environment Variables**: Secret keys never exposed to client
3. **PaymentIntent Verification**: Status verified via Stripe.js, not just redirect params
4. **Checkout Tokens**: Cryptographically secure, unguessable 128-bit tokens
5. **Token Validation**: Format validated before database lookup (fast fail)
6. **HTTPS**: Required for all production endpoints

## Troubleshooting

### Order ID not appearing

1. Check orderId is included in PaymentIntent metadata
2. Verify database connection
3. Check webhook logs

### Duplicate PaymentIntents

1. Verify idempotency key is stable
2. Check orderId is passed consistently
3. Review create-payment-intent logs

### Success UI shows for failed payment

1. The checkout now verifies actual PaymentIntent status
2. Check Stripe.js is loading correctly
3. Verify publishable key is available

### Webhook not receiving events

1. Verify webhook URL is accessible
2. Check STRIPE_WEBHOOKS_ENDPOINT_SECRET
3. Review Stripe webhook logs
4. Ensure dispute events are selected in Stripe Dashboard

### Orders not updating

1. Check webhook handler logs
2. Verify database permissions
3. Ensure PaymentIntent ID is stored correctly

---

_Documentation last updated: February 2026_
