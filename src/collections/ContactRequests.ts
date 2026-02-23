import type { CollectionConfig } from 'payload'
import { anyone, adminOnly } from '@/access'

export const ContactRequests: CollectionConfig = {
  slug: 'contact-requests',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: anyone, // Allow anyone to submit a contact request
    read: adminOnly, // Only admins can read
    update: adminOnly, // Only admins can update
    delete: adminOnly, // Only admins can delete
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
