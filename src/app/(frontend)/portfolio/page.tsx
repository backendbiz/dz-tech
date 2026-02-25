import { Metadata } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { Project, Page } from '@/payload-types'
import { ProjectCard } from '@/components/sections/projects/ProjectCard'
import { Hero } from '@/components/sections'

export const metadata: Metadata = {
  title: 'Our Projects | Apex Consulting',
  description: 'Explore our portfolio of successful projects and case studies.',
}

export default async function ProjectsPage() {
  const payload = await getPayloadClient()

  // Fetch Portfolio Page Content
  const { docs: pageDocs } = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: 'portfolio',
      },
    },
    depth: 1,
  })
  const page = pageDocs[0] as Page | undefined

  const { docs: projects } = await payload.find({
    collection: 'projects',
    where: {
      status: {
        equals: 'published',
      },
    },
    sort: '-publishedAt',
    depth: 1,
  })

  // Extract hero data from page
  const heroTitle = page?.heroTitle || page?.title || 'Our Work'
  const heroSubtitle =
    page?.heroSubtitle ||
    "Discover how we've helped businesses transform and grow through innovative solutions."
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
        subtitle={heroSubtitle}
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

      {/* Projects Grid Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project as Project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-xl text-gray-600">No projects found. Check back soon!</h3>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
