import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'
import { resendAdapter } from '@payloadcms/email-resend'
import { payloadSidebar } from 'payload-sidebar-plugin'

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
      titleSuffix: '- DZ Tech Panel',
      description:
        'DZ Tech Panel - Professional consulting CMS for managing content, services, orders, and projects.',
      openGraph: {
        title: 'DZ Tech Panel',
        description: 'DZ Tech Panel - Professional consulting CMS',
      },
    },
    autoRefresh: true,
    components: {
      graphics: {
        Logo: '@/components/Admin/Logo#AdminLogo',
        Icon: '@/components/Admin/Logo#AdminLogo',
      },
      beforeDashboard: ['@/components/Admin/BeforeDashboard#BeforeDashboard'],
      afterDashboard: ['@/components/Admin/AfterDashboard#AfterDashboard'],
      views: {
        dashboard: {
          Component: '@/components/AdminDashboard#AdminDashboardLayout',
        },
        reports: {
          Component: '@/components/Admin/ReportsView#ReportsView',
          path: '/reports',
        },
        analytics: {
          Component: '@/components/Admin/AnalyticsView#AnalyticsView',
          path: '/analytics',
        },
        chats: {
          Component: '@/components/Admin/ChatsView#ChatsView',
          path: '/chats',
        },
        settings: {
          Component: '@/components/Admin/SettingsView#SettingsView',
          path: '/settings',
        },
        'audit-logs': {
          Component: '@/components/Admin/AuditLogView#AuditLogView',
          path: '/audit-logs',
        },
        'support-tickets': {
          Component: '@/components/Admin/SupportTicketsView#SupportTicketsView',
          path: '/support-tickets',
        },
        integrations: {
          Component: '@/components/Admin/IntegrationsView#IntegrationsView',
          path: '/integrations',
        },
        kanban: {
          Component: '@/components/Admin/KanbanView#KanbanView',
          path: '/kanban',
        },
        calendar: {
          Component: '@/components/Admin/CalendarView#CalendarView',
          path: '/calendar',
        },
        'api-dashboard': {
          Component: '@/components/Admin/ApiDashboardView#ApiDashboardView',
          path: '/api-dashboard',
        },
        'file-manager': {
          Component: '@/components/Admin/FileManagerView#FileManagerView',
          path: '/file-manager',
        },
        billing: {
          Component: '@/components/Admin/BillingView#BillingView',
          path: '/billing',
        },
        team: {
          Component: '@/components/Admin/TeamView#TeamView',
          path: '/team',
        },
        'knowledge-base': {
          Component: '@/components/Admin/KnowledgeBaseView#KnowledgeBaseView',
          path: '/knowledge-base',
        },
        wallets: {
          Component: '@/components/Admin/WalletsView#WalletsView',
          path: '/wallets',
        },
      },
    },
    avatar: {
      Component: '@/components/Admin/Avatar#Avatar',
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
    payloadSidebar({
      groupOrder: {
        Content: 1,
        Media: 2,
        Users: 3,
        Orders: 4,
        Settings: 10,
      },
      icons: {
        users: 'users-round',
        pages: 'file-text',
        media: 'image',
        services: 'briefcase',
        categories: 'folder-tree',
        jobs: 'clipboard-list',
        orders: 'package',
        contactrequests: 'mail',
        projects: 'folder',
        providers: 'building',
      },
      enablePinning: true,
      pinnedStorage: 'localStorage',
    }),
  ],
  email: resendAdapter({
    defaultFromAddress: 'onboarding@resend.dev',
    defaultFromName: 'Apex Consulting',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
})
