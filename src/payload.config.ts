import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'
import { resendAdapter } from '@payloadcms/email-resend'
import { stripePlugin } from '@payloadcms/plugin-stripe'
import { checkoutSessionCompleted } from './stripe/webhooks'
import axios from 'axios'
import crypto from 'crypto'

// Collections
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Services } from './collections/Services'
import { Categories } from './collections/Categories'
import { Jobs } from './collections/Jobs'
import { Orders } from './collections/Orders'
import { ContactRequests } from './collections/ContactRequests'
import { Projects } from './collections/Projects'

// Globals
import { SiteSettings } from './globals/SiteSettings'
import { Navigation } from './globals/Navigation'
import { Footer } from './globals/Footer'
// import { SeedButton } from './components/Admin/SeedButton'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Consulting CMS',
    },
    components: {
      // beforeDashboard: [SeedButton as any],
    },
  },
  endpoints: [
    {
      path: '/create-order',
      method: 'post',
      handler: async (req) => {
        try {
          const body = await req.json()
          const { serviceId, customerId, customerEmail, customerName } = body

          if (!serviceId || !customerId || !customerEmail || !customerName) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 })
          }

          const service = await req.payload.findByID({
            collection: 'services',
            id: serviceId,
          })

          if (!service) {
            return Response.json({ error: 'Service not found' }, { status: 404 })
          }

          if (!service.isActive) {
            return Response.json({ error: 'Service is not available' }, { status: 400 })
          }

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
          })

          console.log(`Order created: ${order.orderId}`)

          const gbpayResponse = await axios.post(
            `${process.env.GBPAY_API_URL}/payment/create-session`,
            {
              orderId: order.orderId,
              amount: order.amount,
              currency: order.currency,
              description: `Payment for ${service.name}`,
              customerEmail: customerEmail,
              customerName: customerName,
              expiresIn: 86400,
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
                Authorization: `Bearer ${process.env.GBPAY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            },
          )

          await req.payload.update({
            collection: 'orders',
            id: order.id,
            data: {
              paymentDetails: {
                sessionId: gbpayResponse.data.sessionId,
                paymentLink: gbpayResponse.data.checkoutUrl,
              },
            },
          })

          return Response.json(
            {
              success: true,
              orderId: order.orderId,
              paymentLink: gbpayResponse.data.checkoutUrl,
              expiresAt: gbpayResponse.data.expiresAt,
              amount: order.amount,
              currency: order.currency,
            },
            { status: 201 },
          )
        } catch (error: any) {
          console.error('Order creation error:', error)
          if (axios.isAxiosError(error) && error.response) {
            return Response.json(
              {
                error: 'Payment gateway error',
                details: error.response.data,
              },
              { status: error.response.status },
            )
          }
          return Response.json(
            {
              error: 'Failed to create order',
              message: error.message,
            },
            { status: 500 },
          )
        }
      },
    },
    {
      path: '/webhooks/gbpay-payment',
      method: 'post',
      handler: async (req) => {
        try {
          const body = await req.json()
          const { orderId, paymentStatus, transactionId, paidAmount, paidAt } = body

          const signature = req.headers.get('x-gbpay-signature')
          const expectedSignature = crypto
            .createHmac('sha256', process.env.GBPAY_WEBHOOK_SECRET || '')
            .update(JSON.stringify(body))
            .digest('hex')

          if (signature !== expectedSignature) {
            return Response.json({ error: 'Invalid signature' }, { status: 401 })
          }

          console.log(`Webhook received for order: ${orderId}, status: ${paymentStatus}`)

          const orders = await req.payload.find({
            collection: 'orders',
            where: {
              orderId: {
                equals: orderId,
              },
            },
          })

          if (orders.docs.length === 0) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          const order = orders.docs[0]

          if (paymentStatus === 'success') {
            await req.payload.update({
              collection: 'orders',
              id: order.id,
              data: {
                status: 'paid',
                paymentDetails: {
                  ...order.paymentDetails,
                  transactionId,
                  paidAt: new Date(paidAt).toISOString(),
                },
              },
            })
            console.log(`✅ Order ${orderId} marked as PAID`)
          } else if (paymentStatus === 'failed') {
            await req.payload.update({
              collection: 'orders',
              id: order.id,
              data: {
                status: 'failed',
              },
            })
            console.log(`❌ Order ${orderId} marked as FAILED`)
          }

          return Response.json({
            received: true,
            orderId: orderId,
          })
        } catch (error: any) {
          console.error('Webhook processing error:', error)
          return Response.json(
            {
              error: 'Webhook processing failed',
              message: error.message,
            },
            { status: 500 },
          )
        }
      },
    },
    {
      path: '/orders/:orderId',
      method: 'get',
      handler: async (req) => {
        try {
          const { orderId } = req.routeParams as { orderId: string }

          const orders = await req.payload.find({
            collection: 'orders',
            where: {
              orderId: {
                equals: orderId,
              },
            },
          })

          if (orders.docs.length === 0) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          const order = orders.docs[0]

          return Response.json({
            orderId: order.orderId,
            status: order.status,
            amount: order.amount,
            currency: order.currency,
            customer: order.customer,
            paymentLink: order.paymentDetails?.paymentLink,
            paidAt: order.paymentDetails?.paidAt,
            createdAt: order.createdAt,
          })
        } catch (error) {
          console.error('Error fetching order:', error)
          return Response.json({ error: 'Failed to fetch order' }, { status: 500 })
        }
      },
    },
  ],
  collections: [Users, Media, Pages, Services, Categories, Jobs, Orders, Projects, ContactRequests],

  globals: [SiteSettings, Navigation, Footer],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT, // MinIO endpoint
        forcePathStyle: true, // Required for MinIO
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION,
      },
    }),
    stripePlugin({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
      stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET || '',
      webhooks: {
        'checkout.session.completed': checkoutSessionCompleted,
      },
    }),
  ],
  email: resendAdapter({
    defaultFromAddress: 'onboarding@resend.dev',
    defaultFromName: 'Apex Consulting',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
})
