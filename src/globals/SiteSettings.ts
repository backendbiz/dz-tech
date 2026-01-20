import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateGlobal],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            {
              name: 'siteName',
              type: 'text',
              required: true,
              defaultValue: 'Consulting',
            },
            {
              name: 'siteDescription',
              type: 'textarea',
              defaultValue: 'Professional consulting services for your business growth',
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
        {
          label: 'Contact',
          fields: [
            {
              name: 'email',
              type: 'email',
            },
            {
              name: 'phone',
              type: 'text',
            },
            {
              name: 'address',
              type: 'textarea',
            },
            {
              name: 'whatsapp',
              type: 'text',
              admin: {
                description: 'WhatsApp number for floating button',
              },
            },
          ],
        },
        {
          label: 'Social',
          fields: [
            {
              name: 'socialLinks',
              type: 'array',
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  options: [
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'Twitter', value: 'twitter' },
                    { label: 'LinkedIn', value: 'linkedin' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'YouTube', value: 'youtube' },
                  ],
                  required: true,
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'defaultMetaTitle',
              type: 'text',
            },
            {
              name: 'defaultMetaDescription',
              type: 'textarea',
            },
            {
              name: 'defaultOgImage',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
      ],
    },
  ],
}
