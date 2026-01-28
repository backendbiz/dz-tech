# GBPay & DZTech Payment Integration - PayloadCMS Implementation

## Project Overview
A payment processing system where **GBPay** serves as a custom payment gateway integrated with **Stripe**, allowing **DZTech** customers to purchase services. Both applications are built on **PayloadCMS**.

---

## System Architecture

### Applications
1. **DZTech** - Merchant platform (PayloadCMS + Node.js)
   - Service catalog
   - Order management
   - Customer management

2. **GBPay** - Payment gateway (PayloadCMS + Node.js)
   - Payment checkout interface
   - Stripe integration
   - Payment session management
   - Payment link generation

3. **Stripe** - Payment processor (3rd party)

### Tech Stack
- **CMS**: PayloadCMS (both projects)
- **Runtime**: Node.js
- **Database**: MongoDB (via PayloadCMS)
- **Payment**: Stripe
- **API**: PayloadCMS REST API + Custom endpoints

---

## PayloadCMS Collections Structure

### DZTech Collections

#### 1. Services Collection
```typescript
// collections/Services.ts
import { CollectionConfig } from 'payload/types';

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'name',
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
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' },
        { label: 'GBP', value: 'GBP' },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
  ],
};
```

#### 2. Orders Collection
```typescript
// collections/Orders.ts
import { CollectionConfig } from 'payload/types';

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderId',
    defaultColumns: ['orderId', 'customerName', 'status', 'amount'],
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
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'paymentDetails',
      type: 'group',
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
        if (operation === 'create') {
          // Generate unique order ID
          data.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return data;
      },
    ],
  },
};
```

#### 3. Customers Collection (Optional)
```typescript
// collections/Customers.ts
import { CollectionConfig } from 'payload/types';

export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'orders',
      type: 'relationship',
      relationTo: 'orders',
      hasMany: true,
    },
  ],
};
```

---

### GBPay Collections

#### 1. PaymentSessions Collection
```typescript
// collections/PaymentSessions.ts
import { CollectionConfig } from 'payload/types';

export const PaymentSessions: CollectionConfig = {
  slug: 'payment-sessions',
  admin: {
    useAsTitle: 'sessionId',
    defaultColumns: ['sessionId', 'orderId', 'amount', 'status'],
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
      },
    },
    {
      name: 'orderId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'merchantId',
      type: 'text',
      defaultValue: 'dztech',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'USD',
      options: [
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' },
        { label: 'GBP', value: 'GBP' },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
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
        },
        {
          name: 'clientSecret',
          type: 'text',
          admin: {
            description: 'Used by frontend to complete payment',
          },
        },
      ],
    },
    {
      name: 'urls',
      type: 'group',
      fields: [
        {
          name: 'success',
          type: 'text',
          admin: {
            description: 'Redirect URL after successful payment',
          },
        },
        {
          name: 'failure',
          type: 'text',
          admin: {
            description: 'Redirect URL after failed payment',
          },
        },
        {
          name: 'webhook',
          type: 'text',
          required: true,
          admin: {
            description: 'Merchant webhook URL for payment notifications',
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
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional data from merchant',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          // Generate unique session ID
          data.sessionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return data;
      },
    ],
  },
};
```

#### 2. Transactions Collection
```typescript
// collections/Transactions.ts
import { CollectionConfig } from 'payload/types';

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'transactionId',
  },
  fields: [
    {
      name: 'transactionId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'payment-sessions',
      required: true,
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'status',
      type: 'text',
      required: true,
    },
    {
      name: 'paymentMethod',
      type: 'text',
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
};
```

---

## PayloadCMS Configuration

### DZTech - payload.config.ts
```typescript
import { buildConfig } from 'payload/config';
import path from 'path';
import { Orders } from './collections/Orders';
import { Services } from './collections/Services';
import { Customers } from './collections/Customers';

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    user: 'users',
  },
  collections: [
    Orders,
    Services,
    Customers,
    // ... other collections
  ],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: {
    type: 'mongodb',
    url: process.env.DATABASE_URI,
  },
  endpoints: [
    {
      path: '/create-order',
      method: 'post',
      handler: async (req, res) => {
        try {
          const { serviceId, customerId, customerEmail, customerName } = req.body;

          // Fetch service
          const service = await req.payload.findByID({
            collection: 'services',
            id: serviceId,
          });

          if (!service) {
            return res.status(404).json({ error: 'Service not found' });
          }

          // Create order
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
              currency: service.currency,
              status: 'pending',
            },
          });

          // Call GBPay to create payment session
          const axios = require('axios');
          const gbpayResponse = await axios.post(
            `${process.env.GBPAY_API_URL}/api/payment/create-session`,
            {
              orderId: order.orderId,
              amount: order.amount,
              currency: order.currency,
              description: `Payment for ${service.name}`,
              customerEmail: customerEmail,
              customerName: customerName,
              expiresIn: 86400, // 24 hours
              successUrl: `${process.env.DZTECH_URL}/payment-success`,
              failureUrl: `${process.env.DZTECH_URL}/payment-failure`,
              webhookUrl: `${process.env.DZTECH_URL}/api/webhooks/gbpay-payment`,
              metadata: {
                serviceId,
                customerId,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.GBPAY_API_KEY}`,
              },
            }
          );

          // Update order with payment details
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

          res.json({
            orderId: order.orderId,
            paymentLink: gbpayResponse.data.checkoutUrl,
            expiresAt: gbpayResponse.data.expiresAt,
          });

        } catch (error) {
          console.error('Order creation error:', error);
          res.status(500).json({ error: 'Failed to create order' });
        }
      },
    },
    {
      path: '/webhooks/gbpay-payment',
      method: 'post',
      handler: async (req, res) => {
        try {
          const { orderId, paymentStatus, transactionId, paidAmount, paidAt } = req.body;

          // Verify webhook signature
          const crypto = require('crypto');
          const signature = req.headers['x-gbpay-signature'];
          const expectedSignature = crypto
            .createHmac('sha256', process.env.GBPAY_WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');

          if (signature !== expectedSignature) {
            return res.status(401).json({ error: 'Invalid signature' });
          }

          // Find order
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

          // Update order status
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

            // TODO: Trigger fulfillment process
            console.log(`Order ${orderId} marked as paid`);
          } else if (paymentStatus === 'failed') {
            await req.payload.update({
              collection: 'orders',
              id: order.id,
              data: {
                status: 'failed',
              },
            });
          }

          res.json({ received: true });

        } catch (error) {
          console.error('Webhook processing error:', error);
          res.status(500).json({ error: 'Webhook processing failed' });
        }
      },
    },
  ],
});
```

---

### GBPay - payload.config.ts
```typescript
import { buildConfig } from 'payload/config';
import path from 'path';
import { PaymentSessions } from './collections/PaymentSessions';
import { Transactions } from './collections/Transactions';

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:4000',
  admin: {
    user: 'users',
  },
  collections: [
    PaymentSessions,
    Transactions,
    // ... other collections
  ],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: {
    type: 'mongodb',
    url: process.env.DATABASE_URI,
  },
  endpoints: [
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

          // Create Stripe PaymentIntent
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(sessionData.amount * 100),
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

          // Calculate expiration
          const expiresAt = new Date(Date.now() + sessionData.expiresIn * 1000);

          // Create payment session in PayloadCMS
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

          res.status(201).json({
            sessionId: session.sessionId,
            checkoutUrl: `${process.env.GBPAY_URL}/checkout?session=${session.sessionId}`,
            expiresAt: session.expiresAt,
          });

        } catch (error) {
          console.error('Session creation error:', error);
          res.status(500).json({ error: 'Failed to create payment session' });
        }
      },
    },
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
          });

        } catch (error) {
          res.status(404).json({ error: 'Session not found' });
        }
      },
    },
    {
      path: '/webhooks/stripe',
      method: 'post',
      handler: async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        try {
          const event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
          );

          if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;

            // Find session
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

              // Notify merchant (DZTech)
              const axios = require('axios');
              const crypto = require('crypto');
              
              const payload = {
                orderId: session.orderId,
                paymentStatus: 'success',
                transactionId: session.sessionId,
                paidAmount: session.amount,
                paidAt: new Date(),
              };

              const signature = crypto
                .createHmac('sha256', process.env.WEBHOOK_SIGNING_SECRET)
                .update(JSON.stringify(payload))
                .digest('hex');

              await axios.post(session.urls.webhook, payload, {
                headers: {
                  'Content-Type': 'application/json',
                  'X-GBPay-Signature': signature,
                },
              });

              console.log(`Payment succeeded for session: ${session.sessionId}`);
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
  express: {
    // Custom Express routes for checkout pages
    postMiddleware: [
      (app) => {
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
                  equals: sessionId,
                },
              },
            });

            if (sessions.docs.length === 0) {
              return res.status(404).send('Payment session not found');
            }

            const session = sessions.docs[0];

            // Check expiration
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
            res.status(500).send('Error loading checkout');
          }
        });

        // Success page
        app.get('/checkout/success', async (req, res) => {
          const { session: sessionId } = req.query;
          // Render success page with session details
          res.render('success', { sessionId });
        });

        // Failure page
        app.get('/checkout/failure', async (req, res) => {
          const { session: sessionId } = req.query;
          // Render failure page
          res.render('failure', { sessionId });
        });
      },
    ],
  },
});
```

---

## Project Structure

### DZTech (PayloadCMS)
```
dztech/
├── src/
│   ├── collections/
│   │   ├── Orders.ts
│   │   ├── Services.ts
│   │   └── Customers.ts
│   ├── payload.config.ts
│   └── server.ts
├── .env
├── package.json
└── tsconfig.json
```

### GBPay (PayloadCMS)
```
gbpay/
├── src/
│   ├── collections/
│   │   ├── PaymentSessions.ts
│   │   └── Transactions.ts
│   ├── views/
│   │   ├── checkout.ejs
│   │   ├── success.ejs
│   │   ├── failure.ejs
│   │   └── expired.ejs
│   ├── public/
│   │   ├── js/
│   │   │   └── checkout.js
│   │   └── css/
│   │       └── styles.css
│   ├── payload.config.ts
│   └── server.ts
├── .env
├── package.json
└── tsconfig.json
```

---

## Environment Variables

### DZTech .env
```bash
# Payload
PAYLOAD_SECRET=your-payload-secret-key
DATABASE_URI=mongodb://localhost:27017/dztech
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# URLs
DZTECH_URL=http://localhost:3000

# GBPay Integration
GBPAY_API_URL=http://localhost:4000/api
GBPAY_API_KEY=dztech_api_key_12345
GBPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### GBPay .env
```bash
# Payload
PAYLOAD_SECRET=your-payload-secret-key
DATABASE_URI=mongodb://localhost:27017/gbpay
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:4000

# Application
GBPAY_URL=http://localhost:4000

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Security
WEBHOOK_SIGNING_SECRET=your_signing_secret
API_KEY_DZTECH=dztech_api_key_12345
```

---

## Installation & Setup

### Both Projects
```bash
npm install payload express
npm install stripe axios
npm install dotenv
npm install -D typescript @types/express ts-node
```

### Running Projects

```bash
# Terminal 1 - DZTech
cd dztech
npm run dev

# Terminal 2 - GBPay
cd gbpay
npm run dev

# Terminal 3 - Stripe webhooks
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

---

## API Usage Examples

### 1. Create Order (DZTech)
```bash
POST http://localhost:3000/api/create-order
Content-Type: application/json

{
  "serviceId": "64abc123def456",
  "customerId": "customer_123",
  "customerEmail": "john@example.com",
  "customerName": "John Doe"
}
```

### 2. Access Checkout Page
```
http://localhost:4000/checkout?session=pay_1234567890_abc
```

### 3. Check Order Status (DZTech)
```bash
GET http://localhost:3000/api/orders/{orderId}
```

---

## Key Benefits of PayloadCMS Integration

1. **Admin Panel**: Built-in UI for managing orders, sessions, services
2. **Type Safety**: Auto-generated TypeScript types
3. **GraphQL API**: Auto-generated GraphQL endpoints
4. **REST API**: Auto-generated REST endpoints
5. **Authentication**: Built-in user authentication
6. **File Uploads**: Built-in media management
7. **Hooks**: Lifecycle hooks for business logic
8. **Access Control**: Granular permission system

---

## Next Steps

1. Set up both PayloadCMS projects
2. Create collections as specified
3. Implement custom endpoints
4. Build checkout UI for GBPay
5. Test payment flow end-to-end
6. Set up Stripe webhooks
7. Deploy to production

This architecture leverages PayloadCMS's powerful features while maintaining clean separation between the payment gateway and merchant systems!
