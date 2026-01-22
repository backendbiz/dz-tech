import React from 'react'
import {
  Features,
  About,
  Stats,
  CTABanner,
  ServicesGrid,
  ContactForm,
  Team,
  Clients,
  Testimonials,
  Process,
  FAQ,
  Pricing,
  VideoBlock,
  ProjectGrid,
  Careers,
} from '@/components/sections'
import { RichText } from '@/components/RichText'
import type { IconName } from '@/components/ui'
import type { Page } from '@/payload-types'

// Define the shape of mapped external data
export interface RenderBlocksProps {
  blocks: Page['layout']
  data: {
    services: React.ComponentProps<typeof ServicesGrid>['services']
    projects: React.ComponentProps<typeof ProjectGrid>['projects']
    jobs: React.ComponentProps<typeof Careers>['jobs']
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockRenderer = (block: any, index: number) => React.ReactNode

export const RenderBlocks: React.FC<RenderBlocksProps> = ({ blocks, data }) => {
  if (!blocks) return null

  const { services, projects, jobs } = data

  const renderers: Record<string, BlockRenderer> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'features-block': (block: any, index) => (
      <Features
        key={block.id || index}
        title={block.heading || ''}
        subtitle={block.subtitle || ''}
        features={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          block.features?.map((f: any) => ({
            icon: (f.icon as IconName) || 'briefcase',
            title: f.title,
            description: f.description || '',
          })) || []
        }
        columns={4}
        background={block.background || 'white'}
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'stats-block': (block: any, index) => (
      <Stats
        key={block.id || index}
        stats={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          block.stats?.map((s: any) => ({
            value: s.value,
            label: s.label,
          })) || []
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'about-block': (block: any, index) => {
      // Handle features string array from object array
      const aboutFeatures =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        block.features?.map((f: any) => f.text || '').filter(Boolean) || []
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
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'cta-block': (block: any, index) => (
      <CTABanner
        key={block.id || index}
        heading={block.heading}
        description={block.description || ''}
        ctaText={block.buttonText}
        ctaLink={block.buttonLink}
        variant={block.style || 'navy'}
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'services-block': (block: any, index) => (
      <ServicesGrid
        key={block.id || index}
        title={block.title || ''}
        subtitle={block.subtitle || ''}
        services={services.slice(0, block.limit || 6)}
        columns={3}
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'contact-block': (block: any, index) => (
      <ContactForm
        key={block.id || index}
        title={block.title || 'FREE CONSULTATION'}
        subtitle={
          block.subtitle ||
          "Let's discuss how we can help your business grow. Fill out the form and we'll get back to you within 24 hours."
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'team-block': (block: any, index) => (
      <Team
        key={block.id || index}
        heading={block.heading}
        members={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          block.members?.map((m: any) => ({
            name: m.name,
            role: m.role,
            image:
              typeof m.image === 'object' && m.image && 'url' in m.image
                ? (m.image.url as string)
                : undefined,
            bio: m.bio,
          })) || []
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'clients-block': (block: any, index) => (
      <Clients
        key={block.id || index}
        title={block.title || ''}
        clients={
          (block.clients
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ?.map((c: any) => ({
              name: c.name,
              logo:
                typeof c.logo === 'object' && c.logo && 'url' in c.logo
                  ? (c.logo.url as string) || ''
                  : '',
            }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((c: any) => c.logo) as { name: string; logo: string }[]) || []
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'testimonials-block': (block: any, index) => (
      <Testimonials
        key={block.id || index}
        title={block.title || ''}
        subtitle={block.subtitle || ''}
        testimonials={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          block.testimonials?.map((t: any) => ({
            name: t.name,
            role: t.role,
            company: t.company || undefined,
            quote: t.quote,
            image:
              typeof t.image === 'object' && t.image && 'url' in t.image
                ? (t.image.url as string)
                : undefined,
            rating: t.rating || 5,
          })) || []
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'process-block': (block: any, index) => (
      <Process
        key={block.id || index}
        title={block.title || ''}
        steps={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          block.steps?.map((s: any) => ({
            title: s.title,
            description: s.description,
          })) || []
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'faq-block': (block: any, index) => (
      <FAQ
        key={block.id || index}
        title={block.title || ''}
        subtitle={block.subtitle || ''}
        faqs={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          block.faqs?.map((f: any) => ({
            question: f.question,
            answer: f.answer,
          })) || []
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'pricing-block': (block: any, index) => (
      <Pricing
        key={block.id || index}
        title={block.title || ''}
        subtitle={block.subtitle || ''}
        plans={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          block.plans?.map((p: any) => ({
            name: p.name,
            price: p.price,
            period: p.period || undefined,
            description: p.description || undefined,
            features:
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              p.features?.map((f: any) => f.feature || '').filter(Boolean) || [],
            isPopular: p.isPopular || false,
            ctaText: p.ctaText || undefined,
            ctaLink: p.ctaLink || undefined,
          })) || []
        }
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'video-block': (block: any, index) => (
      <VideoBlock
        key={block.id || index}
        heading={block.heading || undefined}
        description={block.description || undefined}
        videoUrl={block.videoUrl}
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'projects-block': (block: any, index) => (
      <ProjectGrid
        key={block.id || index}
        title={block.title || ''}
        subtitle={block.subtitle || ''}
        projects={projects ? projects.slice(0, block.limit || 6) : []}
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'careers-block': (block: any, index) => (
      <Careers
        key={block.id || index}
        title={block.title || ''}
        subtitle={block.subtitle || ''}
        jobs={jobs || []}
      />
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'content-block': (block: any, index) => (
      <section className="section bg-white" key={block.id || index}>
        <div className="container">
          <RichText content={block.content} />
        </div>
      </section>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'legal-block': (block: any, index) => (
      <section className="section bg-white" key={block.id || index}>
        <div className="container max-w-4xl">
          <RichText content={block.content} />
          {block.lastUpdated && (
            <p className="mt-8 text-sm text-gray-500">
              Last updated: {new Date(block.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>
      </section>
    ),
  }

  return (
    <>
      {blocks.map((block, index) => {
        const renderer = renderers[block.blockType]
        return renderer ? renderer(block, index) : null
      })}
    </>
  )
}
