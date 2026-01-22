import { Hero } from '@/components/sections'
import type { IconName } from '@/components/ui'
import { getPayloadClient } from '@/lib/payload'
import { notFound } from 'next/navigation'
import { RenderBlocks } from '@/components/RenderBlocks'

import type { Page } from '@/payload-types'

export default async function HomePage() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'home',
      },
    },
  })

  const page = docs[0] as Page | undefined

  if (!page) {
    return notFound()
  }

  // Fetch services if needed (we can optimize this later to only fetch if the block exists)
  // For now, let's fetch a default set just in case, or we can fetch only when mapping.
  // Actually, we can't await inside the map easily if we do it inline.
  // Let's fetch top services here.
  const { docs: servicesDocs } = await payload.find({
    collection: 'services',
    sort: 'order',
    limit: 6,
  })

  // Fetch projects and jobs for blocks that might use them
  // (Optimization: we could check if blocks exist first, but this is fine for now)
  const { docs: projectDocs } = await payload.find({
    collection: 'projects',
    limit: 6,
  })

  const { docs: jobDocs } = await payload.find({
    collection: 'jobs',
    limit: 6,
  })

  const {
    heroTitle,
    heroType,
    heroImage,
    heroSubtitle,
    ctaText,
    ctaLink,
    secondaryCtaText,
    secondaryCtaLink,
    heroVariant,
  } = page

  const heroImageUrl =
    heroType === 'image' && heroImage && typeof heroImage === 'object' && 'url' in heroImage
      ? heroImage.url
      : undefined

  // Map services to the format expected by ServicesGrid
  const services = servicesDocs.map((service) => ({
    id: service.id,
    slug: service.slug,
    title: service.title,
    description: service.description,
    icon: service.icon as IconName,
    featuredImage:
      service.featuredImage &&
      typeof service.featuredImage === 'object' &&
      'url' in service.featuredImage
        ? service.featuredImage.url
        : undefined,
    price: service.price,
    originalPrice: service.originalPrice || undefined,
    priceUnit: service.priceUnit || undefined,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = projectDocs.map((project: any) => ({
    id: project.id,
    title: project.title,
    slug: project.slug || '',
    category:
      typeof project.category === 'object' && project.category ? project.category.title : undefined,
    image:
      typeof project.featuredImage === 'object' &&
      project.featuredImage &&
      'url' in project.featuredImage
        ? project.featuredImage.url
        : undefined,
    summary: project.meta?.description || undefined,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobs = jobDocs.map((job: any) => ({
    id: job.id,
    title: job.title,
    slug: job.slug || '',
    type: job.type,
    location: job.location,
    salary: job.salary || undefined,
  }))

  return (
    <>
      <Hero
        title={heroTitle || page.title}
        subtitle={heroSubtitle || ''}
        ctaText={ctaText || 'Get Started'}
        ctaLink={ctaLink || '/contact'}
        secondaryCta={
          secondaryCtaText && secondaryCtaLink
            ? {
                text: secondaryCtaText,
                link: secondaryCtaLink,
              }
            : undefined
        }
        variant={heroVariant || 'simple'}
        backgroundImage={heroImageUrl || undefined}
      />

      <RenderBlocks blocks={page.layout} data={{ services, projects, jobs }} />
    </>
  )
}
