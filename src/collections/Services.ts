import type { CollectionConfig } from 'payload'
import { revalidate } from '@/hooks/revalidate'

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'price', 'status'],
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
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'icon',
      type: 'select',
      options: [
        { label: 'Briefcase', value: 'briefcase' },
        { label: 'Chart Bar', value: 'chart-bar' },
        { label: 'Users', value: 'users' },
        { label: 'Target', value: 'target' },
        { label: 'Lightbulb', value: 'lightbulb' },
        { label: 'Shield', value: 'shield' },
        { label: 'Globe', value: 'globe' },
        { label: 'Building', value: 'building' },
        { label: 'Trending Up', value: 'trending-up' },
        { label: 'Award', value: 'award' },
        { label: 'Clipboard', value: 'clipboard' },
        { label: 'Calculator', value: 'calculator' },
      ],
      defaultValue: 'briefcase',
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
          admin: {
            width: '50%',
          },
        },
        {
          name: 'originalPrice',
          type: 'number',
          min: 0,
          admin: {
            width: '50%',
            description: 'Original price (for showing discount)',
          },
        },
      ],
    },
    {
      name: 'priceUnit',
      type: 'select',
      options: [
        { label: 'Per Hour', value: 'hour' },
        { label: 'Per Day', value: 'day' },
        { label: 'Per Month', value: 'month' },
        { label: 'Per Project', value: 'project' },
        { label: 'One Time', value: 'one-time' },
      ],
      defaultValue: 'project',
    },
    {
      name: 'features',
      type: 'array',
      labels: {
        singular: 'Feature',
        plural: 'Features',
      },
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
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
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
