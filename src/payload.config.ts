import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'
import { resendAdapter } from '@payloadcms/email-resend'

// Collections
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Services } from './collections/Services'
import { Categories } from './collections/Categories'
import { Jobs } from './collections/Jobs'
import { Orders } from './collections/Orders'
import { ContactRequests } from './collections/ContactRequests'
import { Projects } from './collections/Projects'
import { Providers } from './collections/Providers'

// Globals
import { SiteSettings } from './globals/SiteSettings'
import { Navigation } from './globals/Navigation'
import { Footer } from './globals/Footer'
// import { SeedButton } from './components/Admin/SeedButton'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Consulting CMS',
    },
    components: {
      views: {
        dashboard: {
          Component: '@/components/AdminDashboard#AdminDashboard',
        },
      },
    },
  },
  collections: [
    Users,
    Media,
    Pages,
    Services,
    Categories,
    Jobs,
    Orders,
    Projects,
    ContactRequests,
    Providers,
  ],

  globals: [SiteSettings, Navigation, Footer],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT, // MinIO endpoint
        forcePathStyle: true, // Required for MinIO
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION,
      },
    }),
  ],
  email: resendAdapter({
    defaultFromAddress: 'onboarding@resend.dev',
    defaultFromName: 'Apex Consulting',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
})
