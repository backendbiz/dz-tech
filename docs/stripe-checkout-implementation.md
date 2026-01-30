# Stripe Checkout Implementation Guide

## Overview

This document describes the custom Stripe checkout implementation for DZTech. The system uses a **single-page checkout** that handles all payment states (form, success, failure) inline.

## Architecture

### Flow Diagram

```
User clicks "Buy" → Generate Order ID → Checkout Page → Cash App → Same Page (Success/Failed UI)
                                              │
                                              ├── Success: Green confirmation + Provider redirect
                                              ├── Failed: Red error + "Try Again" button
                                              └── Processing: Blue processing message
```

### Key Components

1. **BuyButton Component** (`src/components/Service/BuyButton.tsx`)
   - Generates unique order ID
   - Redirects to checkout page with order and service/paymentLink IDs

2. **Checkout Page** (`src/app/(app-checkout)/checkout/page.tsx`)
   - Single page handling ALL states:
     - Payment form (Cash App)
     - Success confirmation
     - Failed error
     - Processing status
     - Provider redirect with countdown

3. **CheckoutClient** (`src/components/checkout/CheckoutClient.tsx`)
   - Client component with full state management
   - Fetches service details and creates PaymentIntent
   - Handles Stripe redirect params to show appropriate UI
   - Verifies actual PaymentIntent status from Stripe

4. **CashAppPaymentForm** (`src/components/checkout/CashAppPaymentForm.tsx`)
   - Stripe Elements integration for Cash App Pay
   - Returns to same checkout page after payment

5. **Create Payment Intent API** (`src/app/api/create-payment-intent/route.ts`)
   - Creates Stripe PaymentIntent
   - Creates pending Order in database
   - Supports both serviceId and paymentLinkId flows

6. **Webhook Handler** (`src/stripe/webhooks.ts`)
   - Handles Stripe webhook events
   - Updates order status in database
   - Sends notifications to provider webhooks

7. **Order ID Generator** (`src/lib/order-generator.ts`)
   - Generates unique order IDs: `ORD-YYYYMMDD-HHMMSS-XXXXX`

## Setup Instructions

### 1. Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Site URL (for redirects)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### 2. Stripe Dashboard Configuration

1. **Create API Keys**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy keys to environment variables

2. **Configure Webhooks**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhooks`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy Webhook Signing Secret to `STRIPE_WEBHOOKS_ENDPOINT_SECRET`

3. **Cash App Requirements**
   - Requires US-based Stripe account
   - Test with `$test_cashtag` in sandbox mode

### 3. Database Schema

The Orders collection includes:

| Field                 | Type         | Description                                 |
| --------------------- | ------------ | ------------------------------------------- |
| orderId               | text         | Client order ID (ORD-XXXXXXXX-XXXXXX-XXXXX) |
| externalId            | text         | Provider's internal order ID                |
| provider              | relationship | Reference to Providers collection           |
| service               | relationship | Reference to Services collection            |
| status                | select       | pending, paid, failed, refunded             |
| total                 | number       | Payment amount                              |
| quantity              | number       | Number of units                             |
| stripeSessionId       | text         | Stripe Checkout Session ID                  |
| stripePaymentIntentId | text         | Stripe Payment Intent ID                    |
| stripePaymentLinkId   | text         | Stripe Payment Link ID (if used)            |
| customerEmail         | email        | Customer's email from Stripe                |

## URL Structure

| URL                                              | Description                     |
| ------------------------------------------------ | ------------------------------- |
| `/checkout?orderId={id}&serviceId={id}`          | Standard checkout               |
| `/checkout?orderId={id}&paymentLinkId={id}`      | Payment Link checkout           |
| `/checkout?orderId={id}&redirect_status=succeeded` | Success state (after Cash App) |
| `/checkout?orderId={id}&redirect_status=failed`  | Failed state                    |
| `/checkout?orderId={id}&status=cancelled`        | User cancelled                  |

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
- Fetches service details
- Creates PaymentIntent via API
- Displays payment form

### 2. Payment Form
- Cash App payment button (via Stripe Elements)
- Order ID and amount displayed
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

| Field                   | Value                                    |
| ----------------------- | ---------------------------------------- |
| serviceId               | Service document ID                      |
| serviceName             | Service title                            |
| quantity                | Number of units                          |
| useCustomStripeAccount  | "false" (always)                         |
| providerId              | Provider ID (if applicable)              |
| providerName            | Provider name (if applicable)            |
| externalId              | Provider's external ID (if applicable)   |
| paymentLinkId           | Payment Link ID (if used)                |

## Payment Description

Visible in Stripe Dashboard:

| Source          | Description Format                                    |
| --------------- | ----------------------------------------------------- |
| Payment Link    | `ServiceName \| PaymentLink: plink_xxx`               |
| Direct          | `ServiceName \| Direct`                               |
| With Provider   | `ServiceName \| Direct (ProviderName)`                |

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
│   │   │   └── page.tsx           # Checkout page wrapper
│   │   ├── layout.tsx             # Checkout layout
│   │   └── payment-standalone/
│   │       └── page.tsx           # Standalone payment page
│   └── api/
│       ├── create-payment-intent/
│       │   └── route.ts           # Create PaymentIntent API
│       ├── services/
│       │   └── [id]/
│       │       └── route.ts       # Service details API
│       └── stripe/
│           └── webhooks/
│               └── route.ts       # Stripe webhooks
├── collections/
│   ├── Orders.ts                  # Orders collection
│   └── Services.ts                # Services collection
├── components/
│   ├── checkout/
│   │   ├── CheckoutClient.tsx     # Main checkout component
│   │   ├── CashAppPaymentForm.tsx # Cash App form
│   │   └── StripeProvider.tsx     # Stripe Elements provider
│   └── Service/
│       └── BuyButton.tsx          # Buy button component
├── hooks/
│   └── manageStripePaymentLink.ts # Auto-create Payment Links
├── lib/
│   ├── order-generator.ts         # Order ID utilities
│   └── stripe.ts                  # Stripe utilities
└── stripe/
    └── webhooks.ts                # Webhook handlers
```

## Testing Checklist

- [ ] Buy button generates unique order ID
- [ ] Checkout page displays correct service and order ID
- [ ] Order ID can be copied to clipboard
- [ ] Cash App payment opens correctly
- [ ] Success UI shows after successful payment
- [ ] Failed UI shows after failed payment
- [ ] Provider redirect works with countdown
- [ ] Webhook updates order status in database
- [ ] Duplicate requests use same PaymentIntent (idempotency)
- [ ] Payment Link flow resolves service correctly

## Security Considerations

1. **Webhook Signature Verification**: All webhooks verified with signing secret
2. **Environment Variables**: Secret keys never exposed to client
3. **PaymentIntent Verification**: Status verified via Stripe.js, not just redirect params
4. **Order ID Validation**: Proper lookup by both ObjectId and orderId field
5. **HTTPS**: Required for all production endpoints

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

### Orders not updating
1. Check webhook handler logs
2. Verify database permissions
3. Ensure PaymentIntent ID is stored correctly
