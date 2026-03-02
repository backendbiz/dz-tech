import type { CollectionConfig } from 'payload'
import { anyone } from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: anyone,
    create: anyone,
    update: anyone,
    delete: anyone,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      defaultValue: 'editor',
      required: true,
      saveToJWT: true, // Include role in JWT for fast access checks
      access: {
        update: ({ req }) => req.user?.role === 'admin', // Only admins can change roles
      },
    },
  ],
}
