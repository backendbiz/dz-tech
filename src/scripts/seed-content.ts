import { getPayload } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import type { Payload } from 'payload'

export const seed = async (payload: Payload) => {
  try {
    console.log('Starting content seeding...')

    // 1. Seed Categories
    console.log('Seeding Categories...')
    const categories = [
      {
        name: 'Strategy',
        slug: 'strategy',
        description: 'Strategic planning and business transformation.',
        icon: 'target',
      },
      {
        name: 'Operations',
        slug: 'operations',
        description: 'Operational efficiency and process optimization.',
        icon: 'briefcase',
      },
      {
        name: 'Technology',
        slug: 'technology',
        description: 'Digital transformation and tech implementation.',
        icon: 'chart',
      },
    ]

    const categoryDocs: Record<string, string> = {}

    for (const cat of categories) {
      const existing = await payload.find({
        collection: 'categories',
        where: { slug: { equals: cat.slug } },
      })

      if (existing.totalDocs > 0) {
        categoryDocs[cat.slug] = existing.docs[0].id
      } else {
        const created = await payload.create({
          collection: 'categories',

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: cat as any,
        })
        categoryDocs[cat.slug] = created.id
      }
    }

    // 2. Seed Services
    console.log('Seeding Services...')
    const services = [
      {
        title: 'Corporate Strategy',
        slug: 'corporate-strategy',
        description: 'Define your long-term vision and strategic roadmap.',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Detailed service content here...', version: 1 }],
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        category: categoryDocs['strategy'],
        icon: 'target',
        price: 5000,
        priceUnit: 'project',
        features: [{ feature: 'Market Analysis' }, { feature: 'Growth Roadmap' }],
        status: 'published',
      },
      {
        title: 'Operational Excellence',
        slug: 'operational-excellence',
        description: 'Streamline your operations for maximum efficiency.',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Detailed service content here...', version: 1 }],
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        category: categoryDocs['operations'],
        icon: 'briefcase',
        price: 3000,
        priceUnit: 'month',
        features: [{ feature: 'Process Audit' }, { feature: 'Workflow Automation' }],
        status: 'published',
      },
      {
        title: 'Digital Transformation',
        slug: 'digital-transformation',
        description: 'Modernize your technology stack and digital capabilities.',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Detailed service content here...', version: 1 }],
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        category: categoryDocs['technology'],
        icon: 'chart-bar',
        price: 10000,
        priceUnit: 'project',
        features: [{ feature: 'Cloud Migration' }, { feature: 'Custom Software' }],
        status: 'published',
      },
    ]

    for (const service of services) {
      const existing = await payload.find({
        collection: 'services',
        where: { slug: { equals: service.slug } },
      })
      if (existing.totalDocs === 0) {
        await payload.create({
          collection: 'services',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: service as any,
        })
      }
    }

    // 3. Seed Jobs
    console.log('Seeding Jobs...')
    const jobs = [
      {
        title: 'Senior Strategy Consultant',
        slug: 'senior-strategy-consultant',
        location: 'New York, NY',
        type: 'Full Time',
        description: 'We are looking for an experienced strategy consultant...',
        status: 'published',
        publishedAt: new Date().toISOString(),
      },
      {
        title: 'Product Manager',
        slug: 'product-manager',
        location: 'Remote',
        type: 'Full Time',
        description: 'Lead our digital product initiatives...',
        status: 'published',
        publishedAt: new Date().toISOString(),
      },
    ]

    for (const job of jobs) {
      const existing = await payload.find({
        collection: 'jobs',
        where: { slug: { equals: job.slug } },
      })
      if (existing.totalDocs === 0) {
        await payload.create({
          collection: 'jobs',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: job as any,
        })
      }
    }

    // 4. Seed Pages (About, Services, Contact, Career)
    console.log('Seeding Pages...')
    const pages = [
      {
        title: 'About Us',
        slug: 'about',
        status: 'published',
        heroType: 'image',
        heroSubtitle: 'Building the future of business through innovation and integrity.',
        layout: [
          {
            blockType: 'about-block',
            heading: 'Our Story',
            description:
              'Founded in 2010, Apex Consulting has grown from a small team of passionate visionaries to a global firm trusting by Fortune 500 companies.',
            features: [
              { text: 'Global Reach' },
              { text: 'Industry Expertise' },
              { text: 'Client-Centric Approach' },
            ],
          },
          {
            blockType: 'team-block',
            heading: 'Meet Our Leaders',
            members: [
              {
                name: 'Sarah Johnson',
                role: 'CEO',
                bio: 'Visionary leader with 20 years of experience.',
              },
              {
                name: 'Michael Chen',
                role: 'CTO',
                bio: 'Tech innovator driven by digital transformation.',
              },
            ],
          },
          {
            blockType: 'stats-block',
            stats: [
              { label: 'Offices Worldwide', value: '12' },
              { label: 'Happy Clients', value: '500+' },
            ],
          },
        ],
      },
      {
        title: 'Our Services',
        slug: 'services',
        status: 'published',
        heroType: 'pattern',
        heroSubtitle: 'Comprehensive solutions tailored to your unique business challenges.',
        layout: [
          {
            blockType: 'services-block',
            title: 'All Services',
            subtitle: 'Explore our full range of capabilities.',
            limit: 12,
          },
          {
            blockType: 'cta-block',
            heading: 'Need a Custom Solution?',
            description: 'Contact us to discuss your specific requirements.',
            buttonText: 'Get in Touch',
            buttonLink: '/contact',
            style: 'blue',
          },
        ],
      },
      {
        title: 'Work With Us',
        slug: 'career',
        status: 'published',
        heroType: 'simple',
        heroSubtitle: 'Join a team of innovators and problem solvers.',
        layout: [
          {
            blockType: 'content-block',
            content: {
              root: {
                type: 'root',
                children: [
                  {
                    type: 'heading',
                    tag: 'h2',
                    children: [{ type: 'text', text: 'Current Openings', version: 1 }],
                    version: 1,
                  },
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'text',
                        text: 'Browse our latest job opportunities below.',
                        version: 1,
                      },
                    ],
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                version: 1,
              },
            },
          },
          // Note: Actual job listing usually happens via a dynamic component or separate block not yet in schema?
          // Or maybe we use a standard content block and the frontend renders the list.
          // For now, simple content.
        ],
      },
      {
        title: 'Contact Us',
        slug: 'contact',
        status: 'published',
        heroType: 'simple',
        heroSubtitle: 'We are here to help. Reach out to us today.',
        layout: [
          {
            blockType: 'contact-block',
            title: 'Get in Touch',
            subtitle: 'Fill out the form below and our team will get back to you shortly.',
          },
          {
            blockType: 'about-block',
            sectionLabel: 'Visit Us',
            heading: 'Our Headquarters',
            description: '123 Business Ave, Suite 100\nNew York, NY 10001',
            features: [{ text: 'Email: info@apex.com' }, { text: 'Phone: +1 (555) 123-4567' }],
          },
        ],
      },
    ]

    for (const page of pages) {
      const existing = await payload.find({
        collection: 'pages',
        where: { slug: { equals: page.slug } },
      })

      if (existing.totalDocs > 0) {
        console.log(`Updating ${page.slug}...`)
        await payload.update({
          collection: 'pages',
          id: existing.docs[0].id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: page as any,
        })
      } else {
        console.log(`Creating ${page.slug}...`)
        await payload.create({
          collection: 'pages',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: page as any,
        })
      }
    }

    // 5. Seed Projects
    console.log('Seeding Projects...')
    const projects = [
      {
        title: 'Global Financial Transformation',
        client: 'FinTech Corp',
        slug: 'global-financial-transformation',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'We helped FinTech Corp overhaul their entire digital infrastructure, resulting in a 300% increase in transaction processing speed.',
                    version: 1,
                  },
                ],
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        categorySlugs: ['strategy', 'technology'],
        status: 'published',
        publishedAt: new Date().toISOString(),
        liveUrl: 'https://example.com/fintech',
      },
      {
        title: 'Supply Chain Optimization',
        client: 'Logistics Pro',
        slug: 'supply-chain-optimization',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'By implementing IoT sensors and AI-driven analytics, we reduced supply chain waste by 25% for Logistics Pro.',
                    version: 1,
                  },
                ],
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        categorySlugs: ['operations'],
        status: 'published',
        publishedAt: new Date().toISOString(),
        liveUrl: 'https://example.com/logistics',
      },
      {
        title: 'Healthcare App Development',
        client: 'MediCare Plus',
        slug: 'healthcare-app-development',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'Developed a patient-centric mobile application that improved medication adherence by 40%.',
                    version: 1,
                  },
                ],
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        categorySlugs: ['technology'],
        status: 'published',
        publishedAt: new Date().toISOString(),
        liveUrl: 'https://example.com/healthcare',
      },
    ]

    // Fetch a random media item to use for projects
    const mediaDocs = await payload.find({
      collection: 'media',
      limit: 1,
    })
    const defaultMediaId = mediaDocs.docs[0]?.id

    if (!defaultMediaId) {
      console.warn(
        'Warning: No media found. Projects will be created without a specific featured image if validation allows, or might fail if required.',
      )
    }

    for (const project of projects) {
      const existing = await payload.find({
        collection: 'projects',
        where: { slug: { equals: project.slug } },
      })

      if (existing.totalDocs === 0) {
        // Map category slugs to IDs
        const relatedCategories = project.categorySlugs
          .map((slug) => categoryDocs[slug])
          .filter(Boolean)

        const projectData = {
          ...project,
          categories: relatedCategories,
          featuredImage: defaultMediaId, // Use the found media ID
        }

        // Remove helper prop
        delete (projectData as any).categorySlugs

        if (defaultMediaId) {
          await payload.create({
            collection: 'projects',
            data: projectData as any,
          })
        } else {
          console.error(
            `Skipping project ${project.title} because no media was found and featuredImage is required.`,
          )
        }
      }
    }

    console.log('Seed content completed successfully!')
  } catch (error) {
    console.error('Error seeding content:', error)
    throw error
  }
}

// Run if called directly via script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const run = async () => {
    const filename = fileURLToPath(import.meta.url)
    const dirname = path.dirname(filename)

    dotenv.config({
      path: path.resolve(dirname, '../../.env'),
    })

    const { default: configPromise } = await import('@payload-config')
    const payload = await getPayload({ config: configPromise })
    await seed(payload)
    process.exit(0)
  }

  run().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
