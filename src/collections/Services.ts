import type { CollectionConfig } from 'payload'
import { revalidate } from '@/hooks/revalidate'
import { encryptStripeKeys, decryptStripeKeysForAPI } from '@/hooks/stripeKeyHooks'

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'title',
    // Updated columns to show Stripe status
    defaultColumns: ['title', 'category', 'price', 'stripeConfig.stripeKeyMode', 'status'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidate],
    beforeChange: [encryptStripeKeys],
    afterRead: [decryptStripeKeysForAPI],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'icon',
      type: 'select',
      options: [
        { label: 'Briefcase', value: 'briefcase' },
        { label: 'Chart Bar', value: 'chart-bar' },
        { label: 'Users', value: 'users' },
        { label: 'Target', value: 'target' },
        { label: 'Lightbulb', value: 'lightbulb' },
        { label: 'Shield', value: 'shield' },
        { label: 'Globe', value: 'globe' },
        { label: 'Building', value: 'building' },
        { label: 'Trending Up', value: 'trending-up' },
        { label: 'Award', value: 'award' },
        { label: 'Clipboard', value: 'clipboard' },
        { label: 'Calculator', value: 'calculator' },
      ],
      defaultValue: 'briefcase',
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
          admin: {
            width: '50%',
          },
        },
        {
          name: 'originalPrice',
          type: 'number',
          min: 0,
          admin: {
            width: '50%',
            description: 'Original price (for showing discount)',
          },
        },
      ],
    },
    {
      name: 'priceUnit',
      type: 'select',
      options: [
        { label: 'Per Hour', value: 'hour' },
        { label: 'Per Day', value: 'day' },
        { label: 'Per Month', value: 'month' },
        { label: 'Per Project', value: 'project' },
        { label: 'One Time', value: 'one-time' },
      ],
      defaultValue: 'project',
    },
    {
      name: 'features',
      type: 'array',
      labels: {
        singular: 'Feature',
        plural: 'Features',
      },
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    // Stripe Configuration - Per-service payment processing
    {
      name: 'stripeConfig',
      type: 'group',
      label: 'Stripe Configuration',
      admin: {
        description:
          'Configure Stripe payment processing for this service. Leave empty to use the default Stripe account.',
      },
      fields: [
        {
          name: 'useCustomStripeAccount',
          type: 'checkbox',
          label: 'Use Custom Stripe Account',
          defaultValue: false,
          admin: {
            description: 'Enable to use a different Stripe account for this service',
          },
        },
        // Dashboard indicator for Stripe key mode
        {
          name: 'stripeKeyMode',
          type: 'select',
          label: 'Stripe Mode',
          options: [
            { label: '🟢 Live', value: 'live' },
            { label: '🟡 Test', value: 'test' },
            { label: '⚪ Default', value: 'unknown' },
          ],
          defaultValue: 'unknown',
          admin: {
            position: 'sidebar',
            readOnly: true,
            description: 'Automatically set based on your Stripe keys',
            condition: (data) => data?.stripeConfig?.useCustomStripeAccount,
          },
        },
        {
          name: 'stripeSecretKey',
          type: 'text',
          label: 'Stripe Secret Key',
          admin: {
            description: 'The secret key starting with sk_live_ or sk_test_ (will be encrypted)',
            condition: (data) => data?.stripeConfig?.useCustomStripeAccount,
          },
        },
        {
          name: 'stripePublishableKey',
          type: 'text',
          label: 'Stripe Publishable Key',
          admin: {
            description: 'The publishable key starting with pk_live_ or pk_test_',
            condition: (data) => data?.stripeConfig?.useCustomStripeAccount,
          },
        },
        {
          name: 'stripeWebhookSecret',
          type: 'text',
          label: 'Webhook Signing Secret',
          admin: {
            description: 'The webhook endpoint secret starting with whsec_ (will be encrypted)',
            condition: (data) => data?.stripeConfig?.useCustomStripeAccount,
          },
        },
      ],
    },
  ],
}
