import { FC } from 'react'
import Link from 'next/link'
import { cn } from '@/utils/cn'

interface Job {
  id: string
  title: string
  slug: string
  type?: string
  location?: string
  salary?: string
}

interface CareersProps {
  title?: string
  subtitle?: string
  jobs: Job[]
  className?: string
}

export const Careers: FC<CareersProps> = ({ title, subtitle, jobs, className }) => {
  if (!jobs || jobs.length === 0) return null

  return (
    <section className={cn('section bg-white', className)}>
      <div className="container max-w-5xl">
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{subtitle}</p>}
          </div>
        )}

        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group relative flex flex-col items-start justify-between rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="mb-4 sm:mb-0">
                <Link href={`/careers/${job.slug}`} className="focus:outline-none">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {job.title}
                  </h3>
                  <span className="absolute inset-0" aria-hidden="true" />
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  {job.type && (
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      {job.type}
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {job.location}
                    </div>
                  )}
                  {job.salary && (
                    <div className="flex items-center gap-1.5 text-green-600 font-medium">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {job.salary}
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  Apply Now
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
