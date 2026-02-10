import type { CollectionConfig } from 'payload'
import { generateApiKey } from '@/lib/api-key'
import {
  encrypt,
  decrypt,
  isEncrypted,
  maskKey,
  isValidSecretKeyFormat,
  isValidPublishableKeyFormat,
  areKeysMismatched,
  getKeyMode,
} from '@/lib/encryption'

export const Providers: CollectionConfig = {
  slug: 'providers',
  admin: {
    useAsTitle: 'name',
    description: 'External platforms that use DZTech as their payment gateway',
    defaultColumns: ['name', 'status', 'paymentGateway', 'createdAt'],
  },
  access: {
    // Admin only access
    read: () => true, // Allow reading for API validation
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate API key on create if not provided
        if (operation === 'create' && !data.apiKey) {
          data.apiKey = generateApiKey()
        }

        // Encrypt gateway credentials before saving
        if (data.gatewayCredentials) {
          const creds = data.gatewayCredentials

          // Encrypt Stripe secret key
          if (creds.stripeSecretKey && !isEncrypted(creds.stripeSecretKey)) {
            creds.stripeSecretKey = encrypt(creds.stripeSecretKey)
          }

          // Encrypt Stripe webhook secret
          if (creds.stripeWebhookSecret && !isEncrypted(creds.stripeWebhookSecret)) {
            creds.stripeWebhookSecret = encrypt(creds.stripeWebhookSecret)
          }

          // Encrypt Square access token
          if (creds.squareAccessToken && !isEncrypted(creds.squareAccessToken)) {
            creds.squareAccessToken = encrypt(creds.squareAccessToken)
          }

          // Encrypt PayPal client secret
          if (creds.paypalClientSecret && !isEncrypted(creds.paypalClientSecret)) {
            creds.paypalClientSecret = encrypt(creds.paypalClientSecret)
          }

          // Detect key mode from publishable key (not encrypted)
          if (creds.stripePublishableKey) {
            creds.stripeKeyMode = getKeyMode(creds.stripePublishableKey)
          }

          data.gatewayCredentials = creds
        }

        return data
      },
    ],
    afterRead: [
      async ({ doc }) => {
        // Decrypt gateway credentials for internal use
        if (doc.gatewayCredentials) {
          const creds = { ...doc.gatewayCredentials }

          if (creds.stripeSecretKey && isEncrypted(creds.stripeSecretKey)) {
            creds._decryptedStripeSecretKey = decrypt(creds.stripeSecretKey)
            creds._maskedStripeSecretKey = maskKey(creds._decryptedStripeSecretKey)
          }

          if (creds.stripeWebhookSecret && isEncrypted(creds.stripeWebhookSecret)) {
            creds._decryptedStripeWebhookSecret = decrypt(creds.stripeWebhookSecret)
          }

          if (creds.squareAccessToken && isEncrypted(creds.squareAccessToken)) {
            creds._decryptedSquareAccessToken = decrypt(creds.squareAccessToken)
          }

          if (creds.paypalClientSecret && isEncrypted(creds.paypalClientSecret)) {
            creds._decryptedPaypalClientSecret = decrypt(creds.paypalClientSecret)
          }

          doc.gatewayCredentials = creds
        }

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Provider Name',
      admin: {
        description: 'Name of the external platform (e.g., Bitloader, GBPay, PlayPlay)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Provider Slug',
      admin: {
        description: 'Unique identifier for the provider (e.g., bitloader)',
      },
    },
    {
      name: 'apiKey',
      type: 'text',
      required: true,
      unique: true,
      label: 'API Key',
      admin: {
        description:
          'The API key this provider will use to authenticate requests. Will be auto-generated if not provided.',
        readOnly: true,
      },
    },
    // Legacy: service relationship is now optional
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      required: false,
      label: 'Linked Service (Optional)',
      admin: {
        description:
          'Optional: Legacy field. Providers now send amount + description directly. Only use if you want to associate a default service.',
      },
    },
    // Payment gateway selection
    {
      name: 'paymentGateway',
      type: 'select',
      label: 'Payment Gateway',
      options: [
        { label: '🌐 Platform Default', value: 'default' },
        { label: '💳 Stripe (Cash App Pay)', value: 'stripe' },
        { label: '🟩 Square', value: 'square' },
        { label: '🅿️ PayPal', value: 'paypal' },
        { label: '₿ Cryptocurrency', value: 'crypto' },
      ],
      defaultValue: 'default',
      admin: {
        position: 'sidebar',
        description:
          'Which payment gateway to use for this provider. "Platform Default" uses the global PAYMENT_GATEWAY setting.',
      },
    },
    // Per-provider gateway credentials toggle
    {
      name: 'useOwnGatewayCredentials',
      type: 'checkbox',
      label: 'Use Own Gateway Credentials',
      defaultValue: false,
      admin: {
        description:
          "Enable this to use provider's own payment gateway account (e.g., their own Stripe keys). When disabled, payments go through the platform's default account.",
      },
    },
    // Gateway Credentials (encrypted at rest)
    {
      name: 'gatewayCredentials',
      type: 'group',
      label: 'Gateway Credentials',
      admin: {
        description:
          "Provider's own payment gateway credentials. All secret keys are encrypted at rest with AES-256-GCM.",
        condition: (data) => data?.useOwnGatewayCredentials === true,
      },
      fields: [
        // === Stripe Credentials ===
        {
          name: 'stripeSecretKey',
          type: 'text',
          label: 'Stripe Secret Key',
          admin: {
            description:
              "Provider's Stripe secret key (sk_live_... or sk_test_...). Encrypted at rest.",
            condition: (data) => {
              const gw = data?.paymentGateway
              return !gw || gw === 'default' || gw === 'stripe'
            },
          },
        },
        {
          name: 'stripePublishableKey',
          type: 'text',
          label: 'Stripe Publishable Key',
          admin: {
            description:
              "Provider's Stripe publishable key (pk_live_... or pk_test_...). Sent to the frontend.",
            condition: (data) => {
              const gw = data?.paymentGateway
              return !gw || gw === 'default' || gw === 'stripe'
            },
          },
        },
        {
          name: 'stripeWebhookSecret',
          type: 'text',
          label: 'Stripe Webhook Secret',
          admin: {
            description:
              "Provider's Stripe webhook endpoint secret (whsec_...). Encrypted at rest.",
            condition: (data) => {
              const gw = data?.paymentGateway
              return !gw || gw === 'default' || gw === 'stripe'
            },
          },
        },
        {
          name: 'stripeKeyMode',
          type: 'select',
          label: 'Stripe Key Mode',
          options: [
            { label: '🧪 Test', value: 'test' },
            { label: '🔴 Live', value: 'live' },
            { label: '❓ Unknown', value: 'unknown' },
          ],
          admin: {
            readOnly: true,
            description: 'Auto-detected from the publishable key.',
            condition: (data) => {
              const gw = data?.paymentGateway
              return !gw || gw === 'default' || gw === 'stripe'
            },
          },
        },
        // === Square Credentials ===
        {
          name: 'squareAccessToken',
          type: 'text',
          label: 'Square Access Token',
          admin: {
            description: "Provider's Square access token. Encrypted at rest.",
            condition: (data) => data?.paymentGateway === 'square',
          },
        },
        {
          name: 'squareLocationId',
          type: 'text',
          label: 'Square Location ID',
          admin: {
            description: "Provider's Square location ID.",
            condition: (data) => data?.paymentGateway === 'square',
          },
        },
        {
          name: 'squareApplicationId',
          type: 'text',
          label: 'Square Application ID',
          admin: {
            description: "Provider's Square application ID. Sent to the frontend.",
            condition: (data) => data?.paymentGateway === 'square',
          },
        },
        {
          name: 'squareEnvironment',
          type: 'select',
          label: 'Square Environment',
          options: [
            { label: '🧪 Sandbox', value: 'sandbox' },
            { label: '🔴 Production', value: 'production' },
          ],
          defaultValue: 'sandbox',
          admin: {
            condition: (data) => data?.paymentGateway === 'square',
          },
        },
        // === PayPal Credentials ===
        {
          name: 'paypalClientId',
          type: 'text',
          label: 'PayPal Client ID',
          admin: {
            description: "Provider's PayPal client ID.",
            condition: (data) => data?.paymentGateway === 'paypal',
          },
        },
        {
          name: 'paypalClientSecret',
          type: 'text',
          label: 'PayPal Client Secret',
          admin: {
            description: "Provider's PayPal client secret. Encrypted at rest.",
            condition: (data) => data?.paymentGateway === 'paypal',
          },
        },
        {
          name: 'paypalEnvironment',
          type: 'select',
          label: 'PayPal Environment',
          options: [
            { label: '🧪 Sandbox', value: 'sandbox' },
            { label: '🔴 Live', value: 'live' },
          ],
          defaultValue: 'sandbox',
          admin: {
            condition: (data) => data?.paymentGateway === 'paypal',
          },
        },
        // === Crypto Credentials ===
        {
          name: 'cryptoGatewayApiKey',
          type: 'text',
          label: 'Crypto Gateway API Key',
          admin: {
            description: "Provider's crypto payment gateway API key. Encrypted at rest.",
            condition: (data) => data?.paymentGateway === 'crypto',
          },
        },
      ],
    },
    // Provider status
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: '🟢 Active', value: 'active' },
        { label: '🔴 Inactive', value: 'inactive' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Only active providers can process payments',
      },
    },
    {
      name: 'webhookUrl',
      type: 'text',
      label: 'Webhook URL',
      admin: {
        description:
          'URL to notify when a payment is completed (POST request with payment details)',
      },
    },
    {
      name: 'successRedirectUrl',
      type: 'text',
      label: 'Success Redirect URL',
      admin: {
        description:
          'URL to redirect users after successful payment. Use {orderId} as placeholder. Example: https://bitloader.com/payment/success?orderId={orderId}',
      },
    },
    {
      name: 'cancelRedirectUrl',
      type: 'text',
      label: 'Cancel Redirect URL',
      admin: {
        description:
          'URL to redirect users if they cancel payment. Use {orderId} as placeholder. Example: https://bitloader.com/payment/cancelled?orderId={orderId}',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Internal notes about this provider',
      },
    },
    // Stats / Metadata
    {
      name: 'lastUsedAt',
      type: 'date',
      label: 'Last Used At',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Last time this provider made an API request',
      },
    },
  ],
}
