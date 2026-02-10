import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'createdAt', 'status', 'total', 'service', 'provider', 'disputeStatus'],
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
        { label: 'Disputed', value: 'disputed' },
      ],
      defaultValue: 'pending',
      required: true,
      admin: {
        position: 'sidebar',
      },
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
        position: 'sidebar',
      },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },

    {
      name: 'customerEmail',
      type: 'email',
    },
    // Dispute Tracking Fields
    {
      name: 'disputeId',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'disputeStatus',
      type: 'select',
      options: [
        { label: 'Warning Needs Response', value: 'warning_needs_response' },
        { label: 'Warning Under Review', value: 'warning_under_review' },
        { label: 'Warning Closed', value: 'warning_closed' },
        { label: 'Needs Response', value: 'needs_response' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
      ],
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'disputeAmount',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Amount disputed in dollars',
      },
    },
    {
      name: 'disputeReason',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
}
