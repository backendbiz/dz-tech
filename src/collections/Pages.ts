import {
  FixedToolbarFeature,
  EXPERIMENTAL_TableFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { revalidate } from '@/hooks/revalidate'
import { formatSlug } from '@/utils/slug'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidate],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },

    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [formatSlug('title')],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              name: 'enableHero',
              type: 'checkbox',
              label: 'Enable Hero Section',
              defaultValue: true,
            },
            {
              name: 'heroTitle',
              type: 'text',
              label: 'Hero Title',
              admin: {
                condition: (data) => Boolean(data?.enableHero),
                description: 'Overrides the default page title in the hero section',
              },
            },
            {
              name: 'heroType',
              type: 'select',
              options: [
                { label: 'Simple', value: 'simple' },
                { label: 'With Image', value: 'image' },
                { label: 'With Pattern', value: 'pattern' },
              ],
              defaultValue: 'simple',
              admin: {
                condition: (data) => Boolean(data?.enableHero),
              },
            },
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                condition: (data) => Boolean(data?.enableHero) && data?.heroType === 'image',
              },
            },
            {
              name: 'heroSubtitle',
              type: 'textarea',
              admin: {
                condition: (data) => Boolean(data?.enableHero),
              },
            },
            {
              type: 'row',
              admin: {
                condition: (data) => Boolean(data?.enableHero),
              },
              fields: [
                {
                  name: 'ctaText',
                  type: 'text',
                  label: 'Primary CTA Text',
                  admin: { width: '50%' },
                },
                {
                  name: 'ctaLink',
                  type: 'text',
                  label: 'Primary CTA Link',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              admin: {
                condition: (data) => Boolean(data?.enableHero),
              },
              fields: [
                {
                  name: 'secondaryCtaText',
                  type: 'text',
                  label: 'Secondary CTA Text',
                  admin: { width: '50%' },
                },
                {
                  name: 'secondaryCtaLink',
                  type: 'text',
                  label: 'Secondary CTA Link',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'heroVariant',
              type: 'select',
              options: [
                { label: 'Home', value: 'home' },
                { label: 'Simple', value: 'simple' },
                { label: 'Minimal', value: 'minimal' },
              ],
              defaultValue: 'simple',
              admin: {
                condition: (data) => Boolean(data?.enableHero),
              },
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ defaultFeatures }) => [
                  ...defaultFeatures,
                  FixedToolbarFeature(),
                  EXPERIMENTAL_TableFeature(),
                ],
              }),
            },
            {
              name: 'layout',
              type: 'blocks',
              blocks: [
                {
                  slug: 'content-block',
                  labels: {
                    singular: 'Content Block',
                    plural: 'Content Blocks',
                  },
                  fields: [
                    {
                      name: 'content',
                      type: 'richText',
                      editor: lexicalEditor({
                        features: ({ defaultFeatures }) => [
                          ...defaultFeatures,
                          FixedToolbarFeature(),
                          EXPERIMENTAL_TableFeature(),
                        ],
                      }),
                    },
                  ],
                },
                {
                  slug: 'legal-block',
                  labels: {
                    singular: 'Legal Content',
                    plural: 'Legal Content Blocks',
                  },
                  fields: [
                    {
                      name: 'content',
                      type: 'richText',
                      editor: lexicalEditor({
                        features: ({ defaultFeatures }) => [
                          ...defaultFeatures,
                          FixedToolbarFeature(),
                          EXPERIMENTAL_TableFeature(),
                        ],
                      }),
                    },
                    {
                      name: 'lastUpdated',
                      type: 'date',
                      label: 'Effective Date',
                    },
                  ],
                },
                {
                  slug: 'cta-block',
                  labels: {
                    singular: 'Call to Action',
                    plural: 'Call to Actions',
                  },
                  fields: [
                    {
                      name: 'heading',
                      type: 'text',
                      required: true,
                    },
                    {
                      name: 'description',
                      type: 'textarea',
                    },
                    {
                      name: 'buttonText',
                      type: 'text',
                      required: true,
                    },
                    {
                      name: 'buttonLink',
                      type: 'text',
                      required: true,
                    },
                    {
                      name: 'style',
                      type: 'select',
                      options: [
                        { label: 'Navy Background', value: 'navy' },
                        { label: 'Blue Background', value: 'blue' },
                        { label: 'Light Background', value: 'light' },
                      ],
                      defaultValue: 'navy',
                    },
                  ],
                },
                {
                  slug: 'features-block',
                  labels: {
                    singular: 'Features Grid',
                    plural: 'Features Grids',
                  },
                  fields: [
                    {
                      name: 'heading',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'text',
                    },
                    {
                      name: 'features',
                      type: 'array',
                      fields: [
                        {
                          name: 'icon',
                          type: 'select',

                          options: [
                            { label: 'Briefcase', value: 'briefcase' },
                            { label: 'Chart', value: 'chart-bar' },
                            { label: 'Users', value: 'users' },
                            { label: 'Target', value: 'target' },
                            { label: 'Lightbulb', value: 'lightbulb' },
                            { label: 'Shield', value: 'shield' },
                            { label: 'Trending Up', value: 'trending-up' },
                            { label: 'Globe', value: 'globe' },
                            { label: 'Building', value: 'building' },
                          ],
                        },
                        {
                          name: 'title',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'description',
                          type: 'textarea',
                        },
                      ],
                    },
                    {
                      name: 'background',
                      type: 'select',
                      options: [
                        { label: 'White', value: 'white' },
                        { label: 'Gray', value: 'gray' },
                      ],
                      defaultValue: 'white',
                    },
                  ],
                },
                {
                  slug: 'stats-block',
                  labels: {
                    singular: 'Statistics',
                    plural: 'Statistics',
                  },
                  fields: [
                    {
                      name: 'stats',
                      type: 'array',
                      fields: [
                        {
                          name: 'value',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'label',
                          type: 'text',
                          required: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  slug: 'team-block',
                  labels: {
                    singular: 'Team Section',
                    plural: 'Team Sections',
                  },
                  fields: [
                    {
                      name: 'heading',
                      type: 'text',
                    },
                    {
                      name: 'members',
                      type: 'array',
                      fields: [
                        {
                          name: 'name',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'role',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'image',
                          type: 'upload',
                          relationTo: 'media',
                        },
                        {
                          name: 'bio',
                          type: 'textarea',
                        },
                      ],
                    },
                  ],
                },
                {
                  slug: 'about-block',
                  labels: {
                    singular: 'About Section',
                    plural: 'About Sections',
                  },
                  fields: [
                    {
                      name: 'sectionLabel',
                      type: 'text',
                      admin: { description: 'Small label above the heading' },
                    },
                    {
                      name: 'heading',
                      type: 'text',
                      required: true,
                    },
                    {
                      name: 'description',
                      type: 'textarea',
                      required: true,
                    },
                    {
                      name: 'features',
                      type: 'array',
                      fields: [
                        {
                          name: 'text',
                          type: 'text',
                        },
                      ],
                    },
                    {
                      name: 'ctaText',
                      type: 'text',
                    },
                    {
                      name: 'ctaLink',
                      type: 'text',
                    },
                  ],
                },
                {
                  slug: 'services-block',
                  labels: {
                    singular: 'Services Grid',
                    plural: 'Services Grids',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'textarea',
                    },
                    {
                      name: 'limit',
                      type: 'number',
                      defaultValue: 6,
                    },
                  ],
                },
                {
                  slug: 'contact-block',
                  labels: {
                    singular: 'Contact Form Section',
                    plural: 'Contact Form Sections',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'textarea',
                    },
                  ],
                },
                {
                  slug: 'clients-block',
                  labels: {
                    singular: 'Clients Section',
                    plural: 'Clients Sections',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                      defaultValue: 'Trusted By Industry Leaders',
                    },
                    {
                      name: 'clients',
                      type: 'array',
                      fields: [
                        {
                          name: 'name',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'logo',
                          type: 'upload',
                          relationTo: 'media',
                          required: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  slug: 'testimonials-block',
                  labels: {
                    singular: 'Testimonials',
                    plural: 'Testimonials',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'text',
                    },
                    {
                      name: 'testimonials',
                      type: 'array',
                      fields: [
                        {
                          name: 'name',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'role',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'company',
                          type: 'text',
                        },
                        {
                          name: 'quote',
                          type: 'textarea',
                          required: true,
                        },
                        {
                          name: 'image',
                          type: 'upload',
                          relationTo: 'media',
                        },
                        {
                          name: 'rating',
                          type: 'number',
                          min: 1,
                          max: 5,
                          defaultValue: 5,
                        },
                      ],
                    },
                  ],
                },
                {
                  slug: 'process-block',
                  labels: {
                    singular: 'Process Steps',
                    plural: 'Process Steps',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'steps',
                      type: 'array',
                      fields: [
                        {
                          name: 'title',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'description',
                          type: 'textarea',
                          required: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  slug: 'faq-block',
                  labels: {
                    singular: 'FAQ',
                    plural: 'FAQs',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'text',
                    },
                    {
                      name: 'faqs',
                      type: 'array',
                      fields: [
                        {
                          name: 'question',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'answer',
                          type: 'textarea',
                          required: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  slug: 'pricing-block',
                  labels: {
                    singular: 'Pricing Plans',
                    plural: 'Pricing Plans',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'text',
                    },
                    {
                      name: 'plans',
                      type: 'array',
                      fields: [
                        {
                          name: 'name',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'price',
                          type: 'text',
                          required: true,
                        },
                        {
                          name: 'period',
                          type: 'text',
                          admin: {
                            placeholder: 'mo, yr, etc',
                          },
                        },
                        {
                          name: 'description',
                          type: 'text',
                        },
                        {
                          name: 'features',
                          type: 'array',
                          fields: [
                            {
                              name: 'feature',
                              type: 'text',
                            },
                          ],
                        },
                        {
                          name: 'isPopular',
                          type: 'checkbox',
                          label: 'Mark as Popular',
                        },
                        {
                          name: 'ctaText',
                          type: 'text',
                        },
                        {
                          name: 'ctaLink',
                          type: 'text',
                        },
                      ],
                    },
                  ],
                },
                {
                  slug: 'video-block',
                  labels: {
                    singular: 'Video Section',
                    plural: 'Video Sections',
                  },
                  fields: [
                    {
                      name: 'heading',
                      type: 'text',
                    },
                    {
                      name: 'description',
                      type: 'textarea',
                    },
                    {
                      name: 'videoUrl',
                      type: 'text',
                      label: 'Video Embed URL',
                      required: true,
                    },
                  ],
                },
                {
                  slug: 'projects-block',
                  labels: {
                    singular: 'Project Grid',
                    plural: 'Project Grids',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'text',
                    },
                    {
                      name: 'limit',
                      type: 'number',
                      defaultValue: 6,
                    },
                  ],
                },
                {
                  slug: 'careers-block',
                  labels: {
                    singular: 'Careers List',
                    plural: 'Careers Lists',
                  },
                  fields: [
                    {
                      name: 'title',
                      type: 'text',
                    },
                    {
                      name: 'subtitle',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
        },
        {
          name: 'metaDescription',
          type: 'textarea',
        },
        {
          name: 'ogImage',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
