import type { CollectionConfig } from 'payload'
import { generateApiKey } from '@/lib/api-key'
import { adminOnly, anyone } from '@/access'

export const Providers: CollectionConfig = {
  slug: 'providers',
  admin: {
    useAsTitle: 'name',
    description: 'External providers that use dztech.shop as their payment gateway',
    defaultColumns: ['name', 'service', 'status', 'createdAt'],
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
        if (operation === 'create' && !data.apiKey) {
          data.apiKey = generateApiKey()
        }
        return data
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
        description: 'Name of the external provider (e.g., Bitloader)',
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
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      required: true,
      label: 'Linked Service',
      admin: {
        description: 'The service whose Stripe configuration will be used for payments',
      },
    },
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
      name: 'paymentMethods',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['cashapp', 'paypal'],
      options: [
        { label: 'Cash App (Stripe)', value: 'cashapp' },
        { label: 'PayPal / Venmo', value: 'paypal' },
      ],
      admin: {
        description: 'Payment methods available on the checkout page for this provider',
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
