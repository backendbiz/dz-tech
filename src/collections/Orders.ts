import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'createdAt', 'status', 'total', 'service', 'provider', 'stripePaymentLinkId'],
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
      label: 'Order ID (Client)',
      index: true,
      admin: {
        description: 'Client-generated order ID (e.g. ORD-...)',
      },
    },
    {
      name: 'externalId',
      type: 'text',
      label: 'External ID',
      index: true,
      admin: {
        description: "Provider's internal order/transaction ID for tracking",
      },
    },
    {
      name: 'provider',
      type: 'relationship',
      relationTo: 'providers',
      admin: {
        description: 'External provider that initiated this order (if applicable)',
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
      name: 'quantity',
      type: 'number',
      defaultValue: 1,
      admin: {
        description: 'Number of units purchased (Total / Service Price)',
      },
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
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'stripePaymentLinkId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description: 'Stripe Payment Link ID used for this order (if applicable)',
      },
    },
    {
      name: 'customerEmail',
      type: 'email',
    },
  ],
}
