import { FC } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/utils/cn'

interface Project {
  id: string
  title: string
  slug: string
  image?: string | null
  category?: string
  summary?: string
}

interface ProjectGridProps {
  title?: string
  subtitle?: string
  projects: Project[]
  limit?: number
  className?: string
}

export const ProjectGrid: FC<ProjectGridProps> = ({ title, subtitle, projects, className }) => {
  if (!projects || projects.length === 0) return null

  return (
    <section className={cn('section bg-white', className)}>
      <div className="container">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 md:mb-16 md:flex-row md:items-end">
          <div className="text-center md:text-left">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-4 max-w-2xl text-lg text-gray-600">{subtitle}</p>}
          </div>
          <Link
            href="/projects"
            className="group hidden items-center gap-2 font-semibold text-blue-600 transition-colors hover:text-blue-700 md:flex"
          >
            View All Projects
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-gray-50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden">
                {project.image ? (
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
                    No Image
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-60 transition-opacity group-hover:opacity-70" />

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  {project.category && (
                    <span className="mb-2 inline-block rounded-full bg-blue-600/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                      {project.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="mb-2 text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {project.title}
                </h3>
                {project.summary && (
                  <p className="line-clamp-2 text-sm text-gray-600">{project.summary}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center md:hidden">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
          >
            View All Projects
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
