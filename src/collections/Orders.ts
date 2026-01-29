import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderId',
    defaultColumns: ['orderId', 'createdAt', 'status', 'total', 'service'],
  },
  access: {
    read: () => true,
    create: () => true, // Creating via webhook or API
    update: () => true, // Updating via webhook
  },
  fields: [
    {
      name: 'orderId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Custom order ID (ORD-YYYYMMDD-HHMMSS-XXXXX)',
      },
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'pending',
      required: true,
    },
    {
      name: 'total',
      type: 'number',
      required: true,
    },
    {
      name: 'stripeSessionId',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'customerEmail',
      type: 'email',
    },
    // If you have authentication, you can link to a user
    // {
    //   name: 'user',
    //   type: 'relationship',
    //   relationTo: 'users',
    // },
  ],
}
