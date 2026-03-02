import { Hero, ServicesGrid, CTABanner, Features } from '@/components/sections'
import type { IconName } from '@/components/ui'
import { getPayloadClient } from '@/lib/payload'
import { notFound } from 'next/navigation'

import type { Page } from '@/payload-types'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'services',
      },
    },
  })
  const page = docs[0] as Page | undefined

  return {
    title: page?.seo?.metaTitle || page?.title || 'Our Services',
    description:
      page?.seo?.metaDescription ||
      'Explore our comprehensive consulting services designed to help your business grow and succeed.',
  }
}

export default async function ServicesPage() {
  const payload = await getPayloadClient()

  // Fetch Services Page
  const { docs: pageDocs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'services',
      },
    },
  })
  const page = pageDocs[0] as Page | undefined

  if (!page) {
    return notFound()
  }

  // Fetch All Services
  const { docs: servicesDocs } = await payload.find({
    collection: 'services',
    sort: 'order',
    limit: 100, // Fetch all relevant services
    depth: 1, // Populate featuredImage relationship
    where: {
      status: {
        equals: 'published',
      },
    },
  })

  // Map services for grid
  const services = servicesDocs.map((service) => ({
    id: service.id,
    slug: service.slug,
    title: service.title,
    description: service.description,

    icon: service.icon as IconName,
    featuredImage:
      service.featuredImage && typeof service.featuredImage === 'object'
        ? {
            url: service.featuredImage.url || undefined,
            sizes: service.featuredImage.sizes
              ? {
                  card: service.featuredImage.sizes.card
                    ? { url: service.featuredImage.sizes.card.url || undefined }
                    : undefined,
                  thumbnail: service.featuredImage.sizes.thumbnail
                    ? { url: service.featuredImage.sizes.thumbnail.url || undefined }
                    : undefined,
                }
              : undefined,
          }
        : null,
    price: service.price,
    originalPrice: service.originalPrice || undefined,
    priceUnit: service.priceUnit || undefined,
  }))

  const {
    heroType,
    heroImage,
    heroSubtitle,
    ctaText,
    ctaLink,
    secondaryCtaText,
    secondaryCtaLink,
    heroVariant,
  } = page

  return (
    <>
      <Hero
        title={page.title}
        subtitle={heroSubtitle || ''}
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
        variant={heroVariant || 'page'}
        backgroundImage={
          heroType === 'image' && heroImage && typeof heroImage === 'object' && 'url' in heroImage
            ? heroImage.url || undefined
            : undefined
        }
      />

      {/* Render Layout Blocks */}
      {page.layout?.map((block, index) => {
        switch (block.blockType) {
          case 'services-block':
            return (
              <ServicesGrid
                key={block.id || index}
                title={block.title || ''}
                subtitle={block.subtitle || ''}
                services={services}
                columns={3}
              />
            )
          case 'cta-block':
            return (
              <CTABanner
                key={block.id || index}
                heading={block.heading}
                description={block.description || ''}
                ctaText={block.buttonText}
                ctaLink={block.buttonLink}
                variant={block.style || 'navy'}
              />
            )
          case 'features-block':
            return (
              <Features
                key={block.id || index}
                title={block.heading || ''}
                subtitle={block.subtitle || ''}
                features={
                  block.features?.map((f) => ({
                    icon: (f.icon as IconName) || 'briefcase',
                    title: f.title,
                    description: f.description || '',
                  })) || []
                }
                columns={4}
                background={block.background || 'white'}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}
