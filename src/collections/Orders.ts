import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: [
      'id',
      'createdAt',
      'status',
      'total',
      'itemName',
      'service',
      'provider',
      'disputeStatus',
    ],
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
      name: 'checkoutToken',
      type: 'text',
      label: 'Checkout Token',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Unique token for secure checkout URL (auto-generated)',
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
    // Service is optional — provider-initiated orders may not have a service
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      required: false,
      admin: {
        description: 'Linked service (optional for provider-initiated orders)',
      },
    },
    // For provider-initiated orders without a service, use these fields
    {
      name: 'itemName',
      type: 'text',
      label: 'Item Name',
      admin: {
        description: 'Name/title of the item being purchased (used when no service is linked)',
      },
    },
    {
      name: 'itemDescription',
      type: 'textarea',
      label: 'Item Description',
      admin: {
        description: 'Description of the item (used when no service is linked)',
      },
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
        description: 'Number of units purchased',
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
    // Gateway-agnostic payment ID (maps to stripePaymentIntentId for Stripe,
    // or a Square payment ID, etc.)
    {
      name: 'gatewayPaymentId',
      type: 'text',
      index: true,
      label: 'Gateway Payment ID',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Payment ID from the payment gateway (e.g., Stripe PaymentIntent ID)',
      },
    },
    {
      name: 'paymentGateway',
      type: 'text',
      label: 'Payment Gateway',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Which payment gateway processed this order (e.g., stripe, square)',
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
