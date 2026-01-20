import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/hooks/revalidate'

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigation',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateGlobal],
  },
  fields: [
    {
      name: 'mainNav',
      type: 'array',
      label: 'Main Navigation',
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
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Internal Link', value: 'internal' },
            { label: 'External Link', value: 'external' },
          ],
          defaultValue: 'internal',
        },
        {
          name: 'subItems',
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
    },
    {
      name: 'ctaButton',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'label',
          type: 'text',
          defaultValue: 'Get Consultation',
        },
        {
          name: 'link',
          type: 'text',
          defaultValue: '/contact',
        },
      ],
    },
  ],
}
