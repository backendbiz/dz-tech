import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { Project } from '@/payload-types'
import { RichText } from '@/components/RichText'
import { Button } from '@/components/ui'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'projects',
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const project = docs[0] as Project | undefined

  if (!project) {
    return {
      title: 'Project Not Found | Apex Consulting',
    }
  }

  return {
    title: `${project.title} | Apex Consulting`,
    description: `Read our case study for ${project.title}.`,
  }
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'projects',
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const project = docs[0] as Project | undefined

  if (!project) {
    notFound()
  }

  // Type guard for featuredImage
  const featuredImageUrl =
    project.featuredImage && typeof project.featuredImage === 'object' && project.featuredImage.url
      ? project.featuredImage.url
      : null

  return (
    <article>
      {/* Hero Section */}
      <section className="relative bg-navy-900 pt-32 pb-20 overflow-hidden">
        {/* Network Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-30 network-pattern"></div>

        <div className="container relative z-10 text-center">
          <div className="mb-4 text-blue-400 font-medium uppercase tracking-wider">
            {project.client}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            {project.title}
          </h1>

          <div className="flex justify-center gap-4 text-gray-300 mb-8">
            {project.categories &&
              Array.isArray(project.categories) &&
              project.categories.length > 0 && (
                <div className="flex gap-2">
                  {project.categories.map((cat, index) => {
                    const categoryName = typeof cat === 'object' ? cat.name : ''
                    return categoryName ? (
                      <span
                        key={index}
                        className="bg-navy-800 px-3 py-1 rounded-full text-sm border border-navy-700"
                      >
                        {categoryName}
                      </span>
                    ) : null
                  })}
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container max-w-4xl mx-auto">
          {/* Featured Image */}
          {featuredImageUrl && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl mb-16">
              <Image
                src={featuredImageUrl}
                alt={project.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left Content */}
            <div className="flex-1">
              <RichText content={project.description} className="prose-lg" />
            </div>

            {/* Sidebar Details */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 sticky top-32">
                <h3 className="text-lg font-bold text-navy-900 mb-6 pb-4 border-b border-gray-200">
                  Project Details
                </h3>

                <div className="space-y-6">
                  {project.client && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Client</div>
                      <div className="font-medium text-navy-900">{project.client}</div>
                    </div>
                  )}

                  {project.publishedAt && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Date</div>
                      <div className="font-medium text-navy-900">
                        {new Date(project.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </div>
                    </div>
                  )}

                  {project.liveUrl && (
                    <div className="pt-4">
                      <Button
                        variant="primary"
                        className="w-full justify-center"
                        href={project.liveUrl}
                        // @ts-expect-error - external link handling in Button might need target prop passed through if supported, otherwise just href is fine.
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit Live Site
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Footer */}
      <section className="bg-gray-50 py-12 border-t border-gray-200">
        <div className="container text-center">
          <Link href="/portfolio">
            <Button variant="outline" className="gap-2">
              ← Back to Portfolio
            </Button>
          </Link>
        </div>
      </section>
    </article>
  )
}
