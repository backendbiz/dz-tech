'use client'

import { useState } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui'

export interface Job {
  id: string
  title: string
  location: string
  type: string
  description: string
  requirements: string[]
  responsibilities: string[]
  slug?: string | null
}

interface CareerJobTabsProps {
  jobs: Job[]
}

export function CareerJobTabs({ jobs }: CareerJobTabsProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '')

  const selectedJob = jobs.find((job) => job.id === selectedJobId)

  if (!jobs.length) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No open positions at the moment. Please check back later.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Left Column: Job Titles */}
      <div className="lg:col-span-3">
        <div className="border border-gray-200 bg-white shadow-sm">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={cn(
                'w-full text-left px-5 py-4 text-[15px] border-b border-gray-100 last:border-b-0 transition-all duration-200 border-l-[3px]',
                selectedJobId === job.id
                  ? 'border-l-blue-500 bg-white text-blue-500 font-medium'
                  : 'border-l-transparent hover:bg-gray-50 text-gray-700',
              )}
            >
              <div className="flex justify-between items-center">
                <span>{job.title}</span>
                {selectedJobId === job.id && <span className="text-blue-500 text-lg">›</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column: Job Details */}
      <div className="lg:col-span-9">
        {selectedJob && (
          <div className="bg-white border border-gray-200 p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-navy-900 mb-2">{selectedJob.title}</h3>

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {selectedJob.location}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {selectedJob.type}
              </span>
            </div>

            <div className="prose max-w-none text-gray-600 space-y-6">
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3">Job Description</h4>
                <p className="leading-relaxed">{selectedJob.description}</p>
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3">Responsibilities</h4>
                <ul className="space-y-2 list-disc pl-5">
                  {selectedJob.responsibilities.map((item, idx) => (
                    <li key={idx} className="pl-1">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3">Requirements</h4>
                <ul className="space-y-2 list-disc pl-5">
                  {selectedJob.requirements.map((item, idx) => (
                    <li key={idx} className="pl-1">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-4">
                <Button variant="default" className="rounded! px-8 bg-blue-500 hover:bg-blue-600">
                  Apply Now
                </Button>
                {selectedJob.slug && (
                  <Button
                    variant="outline"
                    href={`/career/${selectedJob.slug}`}
                    className="rounded! px-8"
                  >
                    View Details
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
