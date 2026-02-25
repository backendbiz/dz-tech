import { Metadata } from 'next'
import { CareerJobTabs, Job } from '@/components/sections/career/CareerJobTabs'
import { getPayloadClient } from '@/lib/payload'
import { Hero } from '@/components/sections'

import type { Page } from '@/payload-types'

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'career',
      },
    },
  })
  const page = docs[0] as Page | undefined

  return {
    title: page?.seo?.metaTitle || page?.title || 'Career',
    description:
      page?.seo?.metaDescription ||
      'Join our team at Apex Consulting. Explore career opportunities.',
  }
}

export default async function CareerPage() {
  const payload = await getPayloadClient()

  // Fetch Career Page Content
  const { docs: pageDocs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'career',
      },
    },
    depth: 1,
  })
  const page = pageDocs[0] as Page | undefined

  const { docs: jobDocs } = await payload.find({
    collection: 'jobs',
    where: {
      status: {
        equals: 'published',
      },
    },
  })

  // Map Payload Jobs to Component Jobs
  const jobs: Job[] = jobDocs.map((job) => ({
    id: job.id,
    title: job.title,
    location: job.location,
    type: job.type,
    description: job.description,
    responsibilities: job.responsibilities?.map((r) => r.text || '').filter(Boolean) || [],
    requirements: job.requirements?.map((r) => r.text || '').filter(Boolean) || [],
    slug: job.slug,
  }))

  // Extract hero data from page
  const heroTitle = page?.heroTitle || page?.title || 'Career'
  const heroSubtitle = page?.heroSubtitle
  const ctaText = page?.ctaText
  const ctaLink = page?.ctaLink
  const secondaryCtaText = page?.secondaryCtaText
  const secondaryCtaLink = page?.secondaryCtaLink
  const heroVariant = page?.heroVariant || 'page'
  const heroImage =
    page?.heroImage && typeof page.heroImage === 'object' && 'url' in page.heroImage
      ? page.heroImage.url || undefined
      : undefined

  return (
    <>
      <Hero
        title={heroTitle}
        subtitle={heroSubtitle || undefined}
        ctaText={ctaText || undefined}
        ctaLink={ctaLink || undefined}
        secondaryCta={
          secondaryCtaText && secondaryCtaLink
            ? {
                text: secondaryCtaText,
                link: secondaryCtaLink,
              }
            : undefined
        }
        variant={heroVariant as 'home' | 'page' | 'simple' | 'minimal'}
        backgroundImage={heroImage}
      />

      {/* Job Listings Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-6 relative inline-block">
              JOIN OUR TEAM
              <span className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-16 h-[3px] bg-blue-500"></span>
            </h2>
            <p className="text-gray-600 mt-10 text-lg">
              Explore exciting career opportunities with us and grow your career in technology. We
              are always looking for talented individuals to join our mission.
            </p>
          </div>

          <CareerJobTabs jobs={jobs} />
        </div>
      </section>
    </>
  )
}
