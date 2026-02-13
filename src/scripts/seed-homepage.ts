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

    console.log('Seeding Homepage...')

    // Check if Home page exists
    const existingPages = await payload.find({
      collection: 'pages',
      where: {
        slug: {
          equals: 'home',
        },
      },
    })

    if (existingPages.totalDocs > 0) {
      console.log('Home page already exists. Updating...')
      await payload.update({
        collection: 'pages',
        id: existingPages.docs[0].id,
        data: getHomePageData(),
        overrideAccess: true,
      })
    } else {
      console.log('Creating Home page...')
      await payload.create({
        collection: 'pages',
        data: getHomePageData(),
        overrideAccess: true,
      })
    }

    console.log('Homepage seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding homepage:', error)
    process.exit(1)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHomePageData(): any {
  return {
    title: 'Strategic Solutions for Global Growth',
    slug: 'home',
    status: 'published',
    // Hero configuration
    heroType: 'pattern',
    heroVariant: 'home',
    heroSubtitle:
      'We help ambitious organizations navigate change, drive innovation, and achieve sustainable growth through expert consulting.',
    ctaText: 'Explore Services',
    ctaLink: '/services',
    secondaryCtaText: 'Contact Us',
    secondaryCtaLink: '/contact',

    // Page Content Layout
    layout: [
      // 1. Stats Block
      {
        blockType: 'stats-block',
        stats: [
          { label: 'Years Experience', value: '15+' },
          { label: 'Global Clients', value: '200+' },
          { label: 'Projects Completed', value: '500+' },
          { label: 'Team Members', value: '50+' },
        ],
      },
      // 2. About Section
      {
        blockType: 'about-block',
        sectionLabel: 'Why Choose Us',
        heading: 'Partnering for Excellence',
        description:
          'At Apex Consulting, we believe that true success comes from a deep understanding of your unique challenges. Our diverse team of experts brings decades of experience across industries to deliver tailored solutions that drive real results.',
        features: [
          { text: 'Data-driven decision making' },
          { text: 'Holistic business strategy' },
          { text: 'Sustainable growth focus' },
          { text: 'Agile implementation' },
        ],
        ctaText: 'More About Us',
        ctaLink: '/about',
      },
      // 3. Features Grid
      {
        blockType: 'features-block',
        heading: 'Our Expertise',
        subtitle: 'Comprehensive solutions for every stage of your business journey.',
        background: 'gray',
        features: [
          {
            title: 'Corporate Strategy',
            description:
              'Define your vision and roadmap for the future with verifiable market insights.',
            icon: 'target',
          },
          {
            title: 'Financial Advisory',
            description: 'Optimize your capital structure and financial performance.',
            icon: 'chart-bar',
          },
          {
            title: 'Operational Efficiency',
            description: 'Streamline processes to reduce costs and improve productivity.',
            icon: 'trending-up',
          },
        ],
      },
      // 4. Services Grid (Dynamic)
      {
        blockType: 'services-block',
        title: 'Our Core Services',
        subtitle:
          'We offer a wide range of consulting services to help you achieve your business goals.',
        limit: 3,
      },
      // 5. CTA Block (Bottom)
      {
        blockType: 'cta-block',
        heading: 'Ready to Transform Your Business?',
        description:
          'Let us help you build a strategy that works. Contact us today for a free consultation.',
        buttonText: 'Get Started',
        buttonLink: '/contact',
        style: 'navy',
      },
    ],
    seo: {
      metaTitle: 'Apex Consulting | Strategic Business Solutions',
      metaDescription:
        'Apex Consulting provides expert strategic guidance, operational improvements, and financial advisory services to global enterprises.',
    },
  }
}

seed()
