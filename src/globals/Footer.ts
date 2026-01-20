import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/hooks/revalidate'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateGlobal],
  },
  fields: [
    {
      name: 'aboutText',
      type: 'textarea',
      label: 'About Section Text',
    },
    {
      name: 'quickLinks',
      type: 'array',
      label: 'Quick Links',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'link',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'offices',
      type: 'array',
      label: 'Office Locations',
      fields: [
        {
          name: 'city',
          type: 'text',
          required: true,
        },
        {
          name: 'address',
          type: 'textarea',
        },
        {
          name: 'phone',
          type: 'text',
        },
      ],
    },
    {
      name: 'copyrightText',
      type: 'text',
      defaultValue: '© 2024 Consulting. All rights reserved.',
    },
    {
      name: 'bottomLinks',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'link',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}
