import type { CollectionConfig } from 'payload'
import { anyone } from '@/access'

export const ContactRequests: CollectionConfig = {
  slug: 'contact-requests',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: anyone,
    read: anyone,
    update: anyone,
    delete: anyone,
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      label: 'Full Name',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email Address',
      required: true,
    },
    {
      name: 'subject',
      type: 'text',
      label: 'Subject',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone Number',
    },
    {
      name: 'details',
      type: 'textarea',
      label: 'Details',
      required: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Attached Image',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Call Back', value: 'call_back' },
        { label: 'Resolved', value: 'resolved' },
      ],
      defaultValue: 'pending',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'remarks',
      type: 'textarea',
      label: 'Internal Remarks',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
