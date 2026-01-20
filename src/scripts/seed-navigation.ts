import { getPayload } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

dotenv.config({
  path: path.resolve(dirname, '../../.env'),
})

async function seed() {
  try {
    const { default: configPromise } = await import('@payload-config')
    const payload = await getPayload({ config: configPromise })

    console.log('Seeding Navigation...')

    await payload.updateGlobal({
      slug: 'navigation',
      data: {
        mainNav: [
          {
            label: 'Home',
            link: '/',
            type: 'internal',
          },
          {
            label: 'About',
            link: '/about',
            type: 'internal',
          },

          {
            label: 'Services',
            link: '/services',
            type: 'internal',
            subItems: [
              { label: 'Strategy', link: '/services/strategy' },
              { label: 'Operations', link: '/services/operations' },
              { label: 'Technology', link: '/services/technology' },
            ],
          },
          {
            label: 'Projects',
            link: '/projects',
            type: 'internal',
          },
          {
            label: 'Contact',
            link: '/contact',
            type: 'internal',
          },
        ],
        ctaButton: {
          enabled: true,
          label: 'Get Consultation',
          link: '/contact',
        },
      },
    })

    console.log('Navigation seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding navigation:', error)
    process.exit(1)
  }
}

seed()
