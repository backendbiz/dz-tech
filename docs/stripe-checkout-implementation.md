# Stripe Checkout Implementation Guide

## Overview

This document describes the custom Stripe checkout implementation for the Apex Consulting website. The system allows customers to purchase services through a branded checkout page that integrates with Stripe for secure payment processing.

## Architecture

### Flow Diagram

```
User clicks "Buy" → Generate Order ID → Custom Checkout Page → Stripe Checkout → Webhook → Order Created
```

### Key Components

1. **BuyButton Component** (`src/components/Service/BuyButton.tsx`)
   - Generates unique order ID
   - Redirects to custom checkout page with order and service IDs

2. **Checkout Page** (`src/app/(frontend)/checkout/`)
   - Displays order summary and service details
   - Shows order ID for user reference
   - Initiates Stripe Checkout Session

3. **Success Page** (`src/app/(frontend)/checkout/success/`)
   - Confirms successful payment
   - Displays order ID for tracking
   - Shows next steps information

4. **Checkout API** (`src/app/api/checkout/route.ts`)
   - Creates Stripe Checkout Sessions
   - Passes order ID to Stripe as metadata

5. **Webhook Handler** (`src/stripe/webhooks.ts`)
   - Handles Stripe webhook events
   - Creates/updates orders in database

6. **Order ID Generator** (`src/lib/order-generator.ts`)
   - Generates unique order IDs in format: `ORD-YYYYMMDD-HHMMSS-XXXXX`

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_your_webhook_secret

# Site URL (for redirects)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### 2. Stripe Dashboard Configuration

1. **Create API Keys**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy the Secret Key to `STRIPE_SECRET_KEY`

2. **Configure Webhooks**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhooks`
   - Select events:
     - `checkout.session.completed`
     - `payment_intent.payment_failed`
   - Copy the Webhook Signing Secret to `STRIPE_WEBHOOKS_ENDPOINT_SECRET`

3. **Create Payment Links (Optional)**
   - Go to Stripe Dashboard > Products > Payment Links
   - Create payment links for each service
   - Store the URLs in `services-config.json`

### 3. Database Schema

The Orders collection includes:

| Field                 | Type         | Description                                 |
| --------------------- | ------------ | ------------------------------------------- |
| orderId               | text         | Custom order ID (ORD-XXXXXXXX-XXXXXX-XXXXX) |
| service               | relationship | Reference to Services collection            |
| status                | select       | pending, paid, failed, refunded             |
| total                 | number       | Payment amount                              |
| stripeSessionId       | text         | Stripe Checkout Session ID                  |
| stripePaymentIntentId | text         | Stripe Payment Intent ID                    |
| customerEmail         | email        | Customer's email from Stripe                |

### 4. URL Structure

- **Checkout Page**: `/checkout?orderId={orderId}&serviceId={serviceId}`
- **Success Page**: `/checkout/success?session_id={sessionId}&orderId={orderId}`
- **Cancelled**: `/checkout?orderId={orderId}&serviceId={serviceId}&status=cancelled`

## Order ID Format

Order IDs follow this format: `ORD-YYYYMMDD-HHMMSS-XXXXX`

- **ORD**: Fixed prefix
- **YYYYMMDD**: Date (e.g., 20260128)
- **HHMMSS**: Time (e.g., 143052)
- **XXXXX**: 5-character random alphanumeric string

Example: `ORD-20260128-143052-X7K9P`

## API Endpoints

### POST /api/checkout

Creates a Stripe Checkout Session.

**Request Body:**

```json
{
  "serviceId": "service-id",
  "orderId": "ORD-20260128-143052-X7K9P" // Optional, generated if not provided
}
```

**Response:**

```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/...",
  "orderId": "ORD-20260128-143052-X7K9P"
}
```

### GET /api/services/[id]

Fetches service details by ID or slug.

**Response:**

```json
{
  "id": "service-id",
  "title": "Service Name",
  "description": "Service description",
  "price": 999,
  "priceUnit": "project",
  "icon": "briefcase",
  "slug": "service-slug"
}
```

## Webhook Events

The system handles the following Stripe webhook events:

### checkout.session.completed

Triggered when a checkout session is completed successfully.

**Actions:**

1. Extract orderId from metadata
2. Check if order already exists
3. Create or update order with paid status
4. Store Stripe session and payment intent IDs

### payment_intent.payment_failed

Triggered when a payment fails.

**Actions:**

1. Find order by orderId
2. Update order status to 'failed'

## Testing Checklist

- [ ] Buy button generates unique order ID
- [ ] Checkout page displays correct service and order ID
- [ ] Order ID can be copied to clipboard
- [ ] Stripe Checkout opens correctly
- [ ] Order ID is passed to Stripe metadata
- [ ] Webhook receives events correctly
- [ ] Order ID is extracted from webhook payload
- [ ] Order is created/updated in database
- [ ] Success page displays order confirmation
- [ ] Cancelled checkout redirects properly

## Security Considerations

1. **Webhook Signature Verification**
   - All webhook requests are verified using the Stripe signing secret
   - Prevents spoofed webhook events

2. **Environment Variables**
   - Secret keys are never exposed to the client
   - Use environment variables for all sensitive data

3. **Order ID Validation**
   - Order IDs are validated on the server
   - Invalid formats are rejected

4. **HTTPS**
   - Always use HTTPS in production
   - Required for Stripe webhook endpoints

## File Structure

```
src/
├── app/
│   ├── (frontend)/
│   │   └── checkout/
│   │       ├── page.tsx           # Checkout page wrapper
│   │       ├── CheckoutClient.tsx # Checkout page UI
│   │       └── success/
│   │           ├── page.tsx       # Success page wrapper
│   │           └── SuccessClient.tsx # Success page UI
│   └── api/
│       ├── checkout/
│       │   └── route.ts           # Checkout API
│       └── services/
│           └── [id]/
│               └── route.ts       # Service details API
├── collections/
│   └── Orders.ts                  # Orders collection with orderId field
├── components/
│   └── Service/
│       └── BuyButton.tsx          # Buy button component
├── config/
│   └── services-config.json       # Services configuration
├── lib/
│   └── order-generator.ts         # Order ID utilities
└── stripe/
    └── webhooks.ts                # Webhook handlers
```

## Troubleshooting

### Order ID not appearing in Stripe

1. Check that orderId is included in the Checkout Session metadata
2. Verify client_reference_id is set correctly
3. Check webhook logs for any errors

### Webhook not receiving events

1. Verify webhook URL is correctly configured
2. Check that STRIPE_WEBHOOKS_ENDPOINT_SECRET is correct
3. Review Stripe webhook logs for failed deliveries

### Orders not being created

1. Check webhook handler console logs
2. Verify database connection
3. Ensure orderId field is properly indexed

## Future Enhancements

- [ ] Email notifications with order confirmation
- [ ] Admin dashboard for order management
- [ ] Order status tracking page for customers
- [ ] Refund handling
- [ ] Multiple currency support
