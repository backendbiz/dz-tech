import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { Job } from '@/payload-types'
import { Button } from '@/components/ui'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'jobs',
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const job = docs[0] as Job | undefined

  if (!job) {
    return {
      title: 'Job Not Found | Apex Consulting',
    }
  }

  return {
    title: `${job.title} | Careers at Apex Consulting`,
    description: `Join us as a ${job.title}. Location: ${job.location}.`,
  }
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'jobs',
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const job = docs[0] as Job | undefined

  if (!job) {
    notFound()
  }

  return (
    <article>
      {/* Hero Section */}
      <section className="relative bg-navy-900 py-24 overflow-hidden">
        {/* Network Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-30 network-pattern"></div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-navy-900 via-navy-800 to-navy-900 opacity-90 z-0"></div>

        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20 mb-6">
            <span>{job.type}</span>
            <span className="w-1 h-1 rounded-full bg-blue-400"></span>
            <span>{job.location}</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            {job.title}
          </h1>

          <Button variant="default" className="mt-4" size="lg">
            Apply Now
          </Button>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-gray-50">
        <div className="container max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
            {/* Description */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-navy-900 mb-4">About the Role</h3>
              <div className="prose max-w-none text-gray-600 whitespace-pre-wrap">
                {job.description}
              </div>
            </div>

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-bold text-navy-900 mb-4">Responsibilities</h3>
                <ul className="space-y-3">
                  {job.responsibilities.map((item, idx) =>
                    item.text ? (
                      <li key={idx} className="flex gap-3 text-gray-600">
                        <span className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-blue-500 shrink-0"></span>
                        <span>{item.text}</span>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-bold text-navy-900 mb-4">Requirements</h3>
                <ul className="space-y-3">
                  {job.requirements.map((item, idx) =>
                    item.text ? (
                      <li key={idx} className="flex gap-3 text-gray-600">
                        <span className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-blue-500 shrink-0"></span>
                        <span>{item.text}</span>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}

            <div className="border-t border-gray-100 pt-8 mt-8 flex justify-center">
              <Button variant="default" size="lg" className="px-12">
                Apply for this position
              </Button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/career">
              <Button variant="outline" className="gap-2">
                ← Back to Careers
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}
