# PayloadCMS Implementation Guide - Step by Step

## Overview
This guide walks you through implementing the GBPay payment gateway with DZTech using PayloadCMS for both projects.

---

## Prerequisites

- Node.js 18+ installed
- MongoDB running (locally or cloud)
- Stripe account (test mode)
- Basic understanding of TypeScript and PayloadCMS

---

## Part 1: DZTech Setup

### Step 1: Initialize DZTech Project

```bash
# If you already have PayloadCMS project, skip to Step 2
npx create-payload-app dztech
cd dztech
npm install axios
```

### Step 2: Create Services Collection

Create `src/collections/Services.ts`:

```typescript
import { CollectionConfig } from 'payload/types';

const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'name',
    group: 'Shop',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'USD',
      options: [
        { label: 'US Dollar', value: 'USD' },
        { label: 'Euro', value: 'EUR' },
        { label: 'British Pound', value: 'GBP' },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggle to enable/disable this service',
      },
    },
  ],
};

export default Services;
```

### Step 3: Create Orders Collection

Create `src/collections/Orders.ts`:

```typescript
import { CollectionConfig } from 'payload/types';

const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderId',
    group: 'Shop',
    defaultColumns: ['orderId', 'customer', 'status', 'amount', 'createdAt'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'orderId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: 'Auto-generated unique order ID',
      },
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      required: true,
    },
    {
      name: 'customer',
      type: 'group',
      fields: [
        {
          name: 'id',
          type: 'text',
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          type: 'email',
          required: true,
        },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: 'Order total amount',
      },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Payment', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: {
        description: 'Current order status',
      },
    },
    {
      name: 'paymentDetails',
      type: 'group',
      admin: {
        description: 'GBPay payment information',
      },
      fields: [
        {
          name: 'sessionId',
          type: 'text',
          admin: {
            description: 'GBPay payment session ID',
          },
        },
        {
          name: 'paymentLink',
          type: 'text',
          admin: {
            description: 'GBPay checkout URL',
          },
        },
        {
          name: 'transactionId',
          type: 'text',
          admin: {
            description: 'Transaction ID after successful payment',
          },
        },
        {
          name: 'paidAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate orderId on creation
        if (operation === 'create' && !data.orderId) {
          data.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return data;
      },
    ],
  },
};

export default Orders;
```

### Step 4: Add Custom Endpoints to DZTech

Update `src/payload.config.ts`:

```typescript
import { buildConfig } from 'payload/config';
import path from 'path';
import Services from './collections/Services';
import Orders from './collections/Orders';
import axios from 'axios';
import crypto from 'crypto';

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  admin: {
    user: 'users',
  },
  collections: [
    Services,
    Orders,
  ],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: {
    type: 'mongodb',
    url: process.env.DATABASE_URI,
  },
  endpoints: [
    // Create Order Endpoint
    {
      path: '/create-order',
      method: 'post',
      handler: async (req, res) => {
        try {
          const { serviceId, customerId, customerEmail, customerName } = req.body;

          // Validate input
          if (!serviceId || !customerId || !customerEmail || !customerName) {
            return res.status(400).json({ 
              error: 'Missing required fields' 
            });
          }

          // Fetch service details
          const service = await req.payload.findByID({
            collection: 'services',
            id: serviceId,
          });

          if (!service) {
            return res.status(404).json({ error: 'Service not found' });
          }

          if (!service.isActive) {
            return res.status(400).json({ error: 'Service is not available' });
          }

          // Create order in database
          const order = await req.payload.create({
            collection: 'orders',
            data: {
              service: serviceId,
              customer: {
                id: customerId,
                name: customerName,
                email: customerEmail,
              },
              amount: service.price,
              currency: service.currency || 'USD',
              status: 'pending',
            },
          });

          console.log(`Order created: ${order.orderId}`);

          // Call GBPay API to create payment session
          const gbpayResponse = await axios.post(
            `${process.env.GBPAY_API_URL}/payment/create-session`,
            {
              orderId: order.orderId,
              amount: order.amount,
              currency: order.currency,
              description: `Payment for ${service.name}`,
              customerEmail: customerEmail,
              customerName: customerName,
              expiresIn: 86400, // 24 hours in seconds
              successUrl: `${process.env.DZTECH_URL}/payment-success?order=${order.orderId}`,
              failureUrl: `${process.env.DZTECH_URL}/payment-failure?order=${order.orderId}`,
              webhookUrl: `${process.env.DZTECH_URL}/api/webhooks/gbpay-payment`,
              metadata: {
                serviceId,
                serviceName: service.name,
                customerId,
              },
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.GBPAY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          // Update order with payment link
          await req.payload.update({
            collection: 'orders',
            id: order.id,
            data: {
              paymentDetails: {
                sessionId: gbpayResponse.data.sessionId,
                paymentLink: gbpayResponse.data.checkoutUrl,
              },
            },
          });

          console.log(`Payment link created for order: ${order.orderId}`);

          // Return response
          res.status(201).json({
            success: true,
            orderId: order.orderId,
            paymentLink: gbpayResponse.data.checkoutUrl,
            expiresAt: gbpayResponse.data.expiresAt,
            amount: order.amount,
            currency: order.currency,
          });

        } catch (error) {
          console.error('Order creation error:', error);
          
          if (error.response) {
            // GBPay API error
            return res.status(error.response.status).json({
              error: 'Payment gateway error',
              details: error.response.data,
            });
          }

          res.status(500).json({ 
            error: 'Failed to create order',
            message: error.message,
          });
        }
      },
    },
    
    // Webhook Endpoint for GBPay
    {
      path: '/webhooks/gbpay-payment',
      method: 'post',
      handler: async (req, res) => {
        try {
          const { orderId, paymentStatus, transactionId, paidAmount, paidAt } = req.body;

          // Verify webhook signature
          const signature = req.headers['x-gbpay-signature'];
          const expectedSignature = crypto
            .createHmac('sha256', process.env.GBPAY_WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');

          if (signature !== expectedSignature) {
            console.error('Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
          }

          console.log(`Webhook received for order: ${orderId}, status: ${paymentStatus}`);

          // Find the order
          const orders = await req.payload.find({
            collection: 'orders',
            where: {
              orderId: {
                equals: orderId,
              },
            },
          });

          if (orders.docs.length === 0) {
            console.error(`Order not found: ${orderId}`);
            return res.status(404).json({ error: 'Order not found' });
          }

          const order = orders.docs[0];

          // Update order based on payment status
          if (paymentStatus === 'success') {
            await req.payload.update({
              collection: 'orders',
              id: order.id,
              data: {
                status: 'paid',
                paymentDetails: {
                  ...order.paymentDetails,
                  transactionId,
                  paidAt: new Date(paidAt),
                },
              },
            });

            console.log(`✅ Order ${orderId} marked as PAID`);

            // TODO: Trigger order fulfillment
            // - Send confirmation email
            // - Provision service
            // - Update inventory
            // etc.

          } else if (paymentStatus === 'failed') {
            await req.payload.update({
              collection: 'orders',
              id: order.id,
              data: {
                status: 'failed',
              },
            });

            console.log(`❌ Order ${orderId} marked as FAILED`);
          }

          res.json({ 
            received: true,
            orderId: orderId,
          });

        } catch (error) {
          console.error('Webhook processing error:', error);
          res.status(500).json({ 
            error: 'Webhook processing failed',
            message: error.message,
          });
        }
      },
    },

    // Get Order Status
    {
      path: '/orders/:orderId',
      method: 'get',
      handler: async (req, res) => {
        try {
          const { orderId } = req.params;

          const orders = await req.payload.find({
            collection: 'orders',
            where: {
              orderId: {
                equals: orderId,
              },
            },
          });

          if (orders.docs.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
          }

          const order = orders.docs[0];

          res.json({
            orderId: order.orderId,
            status: order.status,
            amount: order.amount,
            currency: order.currency,
            customer: order.customer,
            paymentLink: order.paymentDetails?.paymentLink,
            paidAt: order.paymentDetails?.paidAt,
            createdAt: order.createdAt,
          });

        } catch (error) {
          console.error('Error fetching order:', error);
          res.status(500).json({ error: 'Failed to fetch order' });
        }
      },
    },
  ],
});
```

### Step 5: Configure DZTech Environment

Create `.env` file:

```bash
# Payload Configuration
PAYLOAD_SECRET=your-super-secret-key-here
DATABASE_URI=mongodb://localhost:27017/dztech
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Application URLs
DZTECH_URL=http://localhost:3000

# GBPay Integration
GBPAY_API_URL=http://localhost:4000/api
GBPAY_API_KEY=dztech_live_key_abc123xyz789
GBPAY_WEBHOOK_SECRET=webhook_secret_key_12345
```

---

## Part 2: GBPay Setup

### Step 1: Initialize GBPay Project

```bash
# If you already have PayloadCMS project, skip this
npx create-payload-app gbpay
cd gbpay
npm install stripe axios ejs
```

### Step 2: Create PaymentSessions Collection

Create `src/collections/PaymentSessions.ts`:

```typescript
import { CollectionConfig } from 'payload/types';

const PaymentSessions: CollectionConfig = {
  slug: 'payment-sessions',
  admin: {
    useAsTitle: 'sessionId',
    defaultColumns: ['sessionId', 'orderId', 'amount', 'status', 'createdAt'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: 'Unique payment session identifier',
      },
    },
    {
      name: 'orderId',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Order ID from merchant (DZTech)',
      },
    },
    {
      name: 'merchantId',
      type: 'text',
      defaultValue: 'dztech',
      required: true,
      admin: {
        description: 'Merchant identifier',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Payment amount',
      },
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'USD',
      options: [
        { label: 'US Dollar', value: 'USD' },
        { label: 'Euro', value: 'EUR' },
        { label: 'British Pound', value: 'GBP' },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Payment description shown to customer',
      },
    },
    {
      name: 'customer',
      type: 'group',
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: {
        description: 'Current payment status',
      },
    },
    {
      name: 'stripe',
      type: 'group',
      admin: {
        description: 'Stripe integration details',
      },
      fields: [
        {
          name: 'paymentIntentId',
          type: 'text',
          admin: {
            description: 'Stripe PaymentIntent ID',
          },
        },
        {
          name: 'clientSecret',
          type: 'text',
          admin: {
            description: 'Client secret for frontend payment',
          },
        },
      ],
    },
    {
      name: 'urls',
      type: 'group',
      admin: {
        description: 'Redirect and webhook URLs',
      },
      fields: [
        {
          name: 'success',
          type: 'text',
          admin: {
            description: 'Success redirect URL',
          },
        },
        {
          name: 'failure',
          type: 'text',
          admin: {
            description: 'Failure redirect URL',
          },
        },
        {
          name: 'webhook',
          type: 'text',
          required: true,
          admin: {
            description: 'Merchant webhook endpoint',
          },
        },
      ],
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Payment link expiration time',
      },
    },
    {
      name: 'paidAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Payment completion timestamp',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional merchant data',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate sessionId on creation
        if (operation === 'create' && !data.sessionId) {
          data.sessionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return data;
      },
    ],
  },
};

export default PaymentSessions;
```

### Step 3: Update GBPay Configuration

Update `src/payload.config.ts`:

```typescript
import { buildConfig } from 'payload/config';
import path from 'path';
import PaymentSessions from './collections/PaymentSessions';
import Stripe from 'stripe';
import axios from 'axios';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  admin: {
    user: 'users',
  },
  collections: [PaymentSessions],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: {
    type: 'mongodb',
    url: process.env.DATABASE_URI,
  },
  endpoints: [
    // Create Payment Session
    {
      path: '/payment/create-session',
      method: 'post',
      handler: async (req, res) => {
        try {
          // Verify API key
          const apiKey = req.headers.authorization?.replace('Bearer ', '');
          if (apiKey !== process.env.API_KEY_DZTECH) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const sessionData = req.body;

          console.log('Creating payment session for order:', sessionData.orderId);

          // Create Stripe PaymentIntent
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(sessionData.amount * 100), // Convert to cents
            currency: sessionData.currency.toLowerCase(),
            description: sessionData.description,
            metadata: {
              orderId: sessionData.orderId,
              merchantId: 'dztech',
            },
            automatic_payment_methods: {
              enabled: true,
            },
          });

          // Calculate expiration time
          const expiresAt = new Date(Date.now() + sessionData.expiresIn * 1000);

          // Create payment session in database
          const session = await req.payload.create({
            collection: 'payment-sessions',
            data: {
              orderId: sessionData.orderId,
              merchantId: 'dztech',
              amount: sessionData.amount,
              currency: sessionData.currency,
              description: sessionData.description,
              customer: {
                email: sessionData.customerEmail,
                name: sessionData.customerName,
              },
              status: 'pending',
              stripe: {
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
              },
              urls: {
                success: sessionData.successUrl,
                failure: sessionData.failureUrl,
                webhook: sessionData.webhookUrl,
              },
              expiresAt,
              metadata: sessionData.metadata,
            },
          });

          console.log(`✅ Payment session created: ${session.sessionId}`);

          res.status(201).json({
            sessionId: session.sessionId,
            checkoutUrl: `${process.env.GBPAY_URL}/checkout?session=${session.sessionId}`,
            expiresAt: session.expiresAt,
          });

        } catch (error) {
          console.error('Session creation error:', error);
          res.status(500).json({ 
            error: 'Failed to create payment session',
            message: error.message,
          });
        }
      },
    },

    // Get Payment Status
    {
      path: '/payment/status/:sessionId',
      method: 'get',
      handler: async (req, res) => {
        try {
          const { sessionId } = req.params;

          const sessions = await req.payload.find({
            collection: 'payment-sessions',
            where: {
              sessionId: {
                equals: sessionId,
              },
            },
          });

          if (sessions.docs.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
          }

          const session = sessions.docs[0];

          res.json({
            status: session.status,
            orderId: session.orderId,
            transactionId: session.sessionId,
            amount: session.amount,
            currency: session.currency,
          });

        } catch (error) {
          res.status(404).json({ error: 'Session not found' });
        }
      },
    },

    // Stripe Webhook Handler
    {
      path: '/webhooks/stripe',
      method: 'post',
      handler: async (req, res) => {
        const sig = req.headers['stripe-signature'];

        try {
          // Verify webhook signature
          const event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
          );

          console.log(`Stripe webhook received: ${event.type}`);

          if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;

            // Find payment session
            const sessions = await req.payload.find({
              collection: 'payment-sessions',
              where: {
                'stripe.paymentIntentId': {
                  equals: paymentIntent.id,
                },
              },
            });

            if (sessions.docs.length > 0) {
              const session = sessions.docs[0];

              // Update session status
              await req.payload.update({
                collection: 'payment-sessions',
                id: session.id,
                data: {
                  status: 'succeeded',
                  paidAt: new Date(),
                },
              });

              console.log(`✅ Payment succeeded for session: ${session.sessionId}`);

              // Notify merchant (DZTech)
              const payload = {
                orderId: session.orderId,
                paymentStatus: 'success',
                transactionId: session.sessionId,
                paidAmount: session.amount,
                paidAt: new Date().toISOString(),
              };

              // Generate signature
              const signature = crypto
                .createHmac('sha256', process.env.WEBHOOK_SIGNING_SECRET)
                .update(JSON.stringify(payload))
                .digest('hex');

              try {
                await axios.post(session.urls.webhook, payload, {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-GBPay-Signature': signature,
                  },
                  timeout: 10000,
                });

                console.log(`✅ Webhook delivered to merchant for order: ${session.orderId}`);
              } catch (webhookError) {
                console.error('Failed to deliver webhook:', webhookError.message);
                // TODO: Implement retry queue
              }
            }
          } else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;

            const sessions = await req.payload.find({
              collection: 'payment-sessions',
              where: {
                'stripe.paymentIntentId': {
                  equals: paymentIntent.id,
                },
              },
            });

            if (sessions.docs.length > 0) {
              const session = sessions.docs[0];

              await req.payload.update({
                collection: 'payment-sessions',
                id: session.id,
                data: {
                  status: 'failed',
                },
              });

              console.log(`❌ Payment failed for session: ${session.sessionId}`);
            }
          }

          res.json({ received: true });

        } catch (error) {
          console.error('Webhook error:', error.message);
          res.status(400).send(`Webhook Error: ${error.message}`);
        }
      },
    },
  ],

  // Custom Express routes
  express: {
    postMiddleware: [
      (app) => {
        // Set view engine
        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));

        // Checkout page
        app.get('/checkout', async (req, res) => {
          const { session: sessionId } = req.query;

          if (!sessionId) {
            return res.status(400).send('Invalid payment link');
          }

          try {
            const sessions = await req.payload.find({
              collection: 'payment-sessions',
              where: {
                sessionId: {
                  equals: sessionId as string,
                },
              },
            });

            if (sessions.docs.length === 0) {
              return res.status(404).send('Payment session not found');
            }

            const session = sessions.docs[0];

            // Check if expired
            if (new Date(session.expiresAt) < new Date()) {
              await req.payload.update({
                collection: 'payment-sessions',
                id: session.id,
                data: { status: 'expired' },
              });
              return res.render('expired', { session });
            }

            // Check if already paid
            if (session.status === 'succeeded') {
              return res.render('already-paid', { session });
            }

            // Render checkout page
            res.render('checkout', {
              session,
              stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            });

          } catch (error) {
            console.error('Checkout error:', error);
            res.status(500).send('Error loading checkout page');
          }
        });

        // Success page
        app.get('/checkout/success', (req, res) => {
          const { session } = req.query;
          res.render('success', { sessionId: session });
        });

        // Failure page
        app.get('/checkout/failure', (req, res) => {
          const { session } = req.query;
          res.render('failure', { sessionId: session });
        });
      },
    ],
  },
});
```

### Step 4: Configure GBPay Environment

Create `.env` file:

```bash
# Payload Configuration
PAYLOAD_SECRET=your-gbpay-secret-key-here
DATABASE_URI=mongodb://localhost:27017/gbpay
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:4000

# Application URL
GBPAY_URL=http://localhost:4000

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Security
WEBHOOK_SIGNING_SECRET=gbpay_webhook_secret_xyz789
API_KEY_DZTECH=dztech_live_key_abc123xyz789
```

### Step 5: Create Checkout View Template

Create `src/views/checkout.ejs`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GBPay Checkout</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #667eea;
            font-size: 32px;
            font-weight: 700;
        }
        .payment-details {
            background: #f7f9fc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .payment-details h3 {
            margin-bottom: 15px;
            color: #2d3748;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            color: #4a5568;
        }
        .detail-row .label {
            font-weight: 500;
        }
        .detail-row .value {
            font-weight: 600;
            color: #2d3748;
        }
        .amount {
            font-size: 36px;
            font-weight: 700;
            color: #667eea;
            text-align: center;
            margin: 20px 0;
        }
        #payment-form {
            margin-top: 30px;
        }
        #card-element {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            background: white;
        }
        #card-errors {
            color: #e53e3e;
            margin-top: 10px;
            font-size: 14px;
        }
        #submit-button {
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        #submit-button:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        #submit-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .spinner {
            display: none;
            margin: 20px auto;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .powered-by {
            text-align: center;
            margin-top: 30px;
            color: #a0aec0;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🔐 GBPay</h1>
        </div>

        <div class="payment-details">
            <h3>Payment Details</h3>
            <div class="detail-row">
                <span class="label">Order ID:</span>
                <span class="value"><%= session.orderId %></span>
            </div>
            <div class="detail-row">
                <span class="label">Description:</span>
                <span class="value"><%= session.description %></span>
            </div>
            <div class="detail-row">
                <span class="label">Customer:</span>
                <span class="value"><%= session.customer.name %></span>
            </div>
        </div>

        <div class="amount">
            <%= session.currency %> <%= session.amount.toFixed(2) %>
        </div>

        <form id="payment-form">
            <div id="card-element"></div>
            <div id="card-errors" role="alert"></div>
            <button id="submit-button" type="submit">
                Pay Now
            </button>
        </form>

        <div class="spinner" id="spinner"></div>

        <div class="powered-by">
            Secured by Stripe | Powered by GBPay
        </div>
    </div>

    <script>
        const stripe = Stripe('<%= stripePublishableKey %>');
        const elements = stripe.elements();
        const cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#2d3748',
                    '::placeholder': {
                        color: '#a0aec0',
                    },
                },
            },
        });

        cardElement.mount('#card-element');

        cardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

        const form = document.getElementById('payment-form');
        const submitButton = document.getElementById('submit-button');
        const spinner = document.getElementById('spinner');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';
            spinner.style.display = 'block';

            const { error, paymentIntent } = await stripe.confirmCardPayment(
                '<%= session.stripe.clientSecret %>',
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: '<%= session.customer.name %>',
                            email: '<%= session.customer.email %>',
                        },
                    },
                }
            );

            if (error) {
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = error.message;
                submitButton.disabled = false;
                submitButton.textContent = 'Pay Now';
                spinner.style.display = 'none';
            } else if (paymentIntent.status === 'succeeded') {
                window.location.href = '/checkout/success?session=<%= session.sessionId %>';
            }
        });
    </script>
</body>
</html>
```

---

## Testing the Integration

### Step 1: Start Both Applications

```bash
# Terminal 1 - DZTech
cd dztech
npm run dev

# Terminal 2 - GBPay
cd gbpay
npm run dev

# Terminal 3 - Stripe CLI
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

### Step 2: Create a Test Order

```bash
curl -X POST http://localhost:3000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "your-service-id",
    "customerId": "test_customer_123",
    "customerEmail": "test@example.com",
    "customerName": "Test User"
  }'
```

### Step 3: Complete Payment

1. Open the payment link in browser
2. Use Stripe test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any 3-digit CVC
5. Submit payment

### Step 4: Verify in Admin Panels

- **DZTech**: Check order status changed to "paid"
- **GBPay**: Check payment session status changed to "succeeded"

---

## Production Deployment Checklist

- [ ] Change Stripe to live mode
- [ ] Set production environment variables
- [ ] Configure proper domain names
- [ ] Set up SSL certificates
- [ ] Configure webhook endpoints with production URLs
- [ ] Test payment flow end-to-end
- [ ] Set up monitoring and logging
- [ ] Implement error alerting
- [ ] Create backup strategy
- [ ] Document API for future reference

---

This complete guide provides everything needed to integrate GBPay with DZTech using PayloadCMS!
