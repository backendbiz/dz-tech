import { Metadata } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { Project } from '@/payload-types'
import { ProjectCard } from '@/components/sections/projects/ProjectCard'

export const metadata: Metadata = {
  title: 'Our Projects | Apex Consulting',
  description: 'Explore our portfolio of successful projects and case studies.',
}

export default async function ProjectsPage() {
  const payload = await getPayloadClient()

  const { docs: projects } = await payload.find({
    collection: 'projects',
    where: {
      status: {
        equals: 'published',
      },
    },
    sort: '-publishedAt',
  })

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-navy-900 py-32 overflow-hidden">
        {/* Network Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-30 network-pattern"></div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-navy-900 via-navy-800 to-navy-900 opacity-90 z-0"></div>

        <div className="container relative z-10 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[0.2em] animate-fade-in-up">
            OUR WORK
          </h1>
          <div className="h-1 w-20 bg-blue-500 mt-6 rounded-full"></div>
          <p className="mt-6 max-w-2xl text-lg text-gray-300">
            Discover how we&apos;ve helped businesses transform and grow through innovative
            solutions.
          </p>
        </div>
      </section>

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
