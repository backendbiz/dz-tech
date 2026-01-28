import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderId',
    group: 'Shop',
    defaultColumns: ['orderId', 'customer', 'status', 'amount', 'createdAt'],
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
        description: 'Auto-generated unique order ID',
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
      admin: {
        description: 'Order total amount',
      },
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
        { label: 'Pending Payment', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: {
        description: 'Current order status',
      },
    },
    {
      name: 'paymentDetails',
      type: 'group',
      admin: {
        description: 'GBPay payment information',
      },
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
          admin: {
            description: 'Transaction ID after successful payment',
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
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate orderId on creation
        if (operation === 'create' && !data.orderId) {
          data.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
        return data
      },
    ],
  },
}
