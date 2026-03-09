import type { CollectionConfig } from 'payload'
import { anyone } from '@/access'

/**
 * Show a field only when the order's paymentMethod matches one of the given methods.
 * Set `includeUnset` to also match orders where paymentMethod hasn't been set yet.
 */
const paymentMethodCondition = (methods: string[], { includeUnset = false } = {}) => {
  return (data: Record<string, unknown>) =>
    methods.includes(data.paymentMethod as string) || (includeUnset && !data.paymentMethod)
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'createdAt', 'status', 'total', 'service', 'provider', 'disputeStatus'],
  },
  access: {
    read: anyone,
    create: anyone,
    update: anyone,
    delete: anyone,
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
        condition: paymentMethodCondition(['cashapp'], { includeUnset: true }),
      },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: paymentMethodCondition(['cashapp'], { includeUnset: true }),
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      options: [
        { label: 'Cash App', value: 'cashapp' },
        { label: 'PayPal', value: 'paypal' },
      ],
      defaultValue: 'cashapp',
      admin: {
        position: 'sidebar',
        description: 'Payment method used for this order',
      },
    },
    {
      name: 'paypalOrderId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'PayPal Order ID (for PayPal payments)',
        condition: paymentMethodCondition(['paypal']),
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
