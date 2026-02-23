import { Hero, About, Stats, CTABanner, Features } from '@/components/sections'
import { Card, Icon, type IconName } from '@/components/ui'
import { getPayloadClient } from '@/lib/payload'
import { notFound } from 'next/navigation'
import type { Page } from '@/payload-types'
import type { Metadata } from 'next'
import Image from 'next/image'

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'about',
      },
    },
  })
  const page = docs[0] as Page | undefined

  return {
    title: page?.seo?.metaTitle || page?.title || 'About Us',
    description:
      page?.seo?.metaDescription ||
      'Learn about our mission, values, and the team behind our consulting services.',
  }
}

export default async function AboutPage() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'about',
      },
    },
  })

  const page = docs[0] as Page | undefined

  if (!page) {
    return notFound()
  }

  const { heroSubtitle, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink, heroVariant } = page

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
      />

      {page.layout?.map((block, index) => {
        switch (block.blockType) {
          case 'about-block':
            // Handle features string array
            const aboutFeatures = block.features?.map((f) => f.text || '').filter(Boolean) || []
            return (
              <About
                key={block.id || index}
                sectionLabel={block.sectionLabel || ''}
                heading={block.heading}
                description={block.description}
                features={aboutFeatures}
                ctaText={block.ctaText || ''}
                ctaLink={block.ctaLink || ''}
              />
            )
          case 'stats-block':
            return (
              <Stats
                key={block.id || index}
                stats={
                  block.stats?.map((s) => ({
                    value: s.value,
                    label: s.label,
                  })) || []
                }
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
          case 'team-block':
            return (
              <section key={block.id || index} className="section bg-white">
                <div className="container">
                  {block.heading && (
                    <div className="mb-12 text-center">
                      {block.heading && <h2 className="section-title">{block.heading}</h2>}
                    </div>
                  )}

                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {block.members?.map((member, i) => (
                      <Card key={member.id || i} className="text-center p-8">
                        {/* 
                            Member Image Handling: 
                            If image exists, render it. 
                            Else fallback to icon placeholder 
                        */}
                        {member.image && typeof member.image === 'object' && member.image.url ? (
                          <div className="mb-5 mx-auto h-24 w-24 relative overflow-hidden rounded-full">
                            <Image
                              src={member.image.url}
                              alt={member.image.alt || member.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="mb-5 inline-flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-navy-900 to-blue-500">
                            <Icon name="users" className="h-10 w-10 text-white" strokeWidth={1.5} />
                          </div>
                        )}

                        <h3 className="mb-1 text-lg font-bold text-navy-900">{member.name}</h3>
                        <p className="mb-3 text-sm font-medium text-blue-500">{member.role}</p>
                        <p className="text-sm text-gray-500">{member.bio}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              </section>
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
          case 'content-block':
            // Can be used for "Mission Section" or generic content
            // For now assume simple rich text rendering if we had a RichText component,
            // but current content-block just has `content`.
            // We'll skip complex rich text rendering for this pass unless user asks for it,
            // or render it simply. The static page had a Mission Section.
            // We can implement a simple renderer or let the user use 'AboutBlock' for mission too as it fits the "Heading + Description" pattern well.
            return null
          default:
            return null
        }
      })}
    </>
  )
}
