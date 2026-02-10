import { Hero, CTABanner, ContactForm } from '@/components/sections'
import { Button, Icon, Card, type IconName } from '@/components/ui'
import { BuyButton } from '@/components/Service/BuyButton'
import { getPayloadClient } from '@/lib/payload'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Service } from '@/payload-types'
// Import RichText renderer if available, or just render plain text/html for now if no custom component.
// Payload 3 usually has a RichText component in @payloadcms/richtext-lexical/react or similar?
// For now, prompt instruction didn't specify installing rich text renderer, so we will handle strings or skip rich text rendering complexity
// and just render description. Or check if we have a RichText component in the project.
// The project structure didn't show one in components/ui.
// We will look for a simple way to render content or just use description for now as main content.

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    where: {
      slug: {
        equals: slug,
      },
    },
  })
  const service = docs[0] as Service | undefined

  if (!service) {
    return { title: 'Service Not Found' }
  }

  return {
    title: service.title,
    description: service.description,
  }
}

export async function generateStaticParams() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    limit: 100, // Reasonable limit for SSG
  })

  return docs.map((service) => ({
    slug: service.slug,
  }))
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const service = docs[0] as Service | undefined

  if (!service) {
    return notFound()
  }

  const priceUnitLabels: Record<string, string> = {
    hour: '/hour',
    day: '/day',
    month: '/month',
    project: '/project',
    'one-time': '',
  }

  return (
    <>
      <Hero
        title={service.title}
        subtitle={service.description}
        variant="page"
        // bgImage={service.featuredImage?.url} // if Hero supported it
      />

      <section className="section bg-white">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10">
                <Icon
                  name={(service.icon as IconName) || 'briefcase'}
                  className="h-10 w-10 text-blue-500"
                  strokeWidth={1.5}
                />
              </div>

              <h2 className="mb-6 text-3xl font-bold text-navy-900">About This Service</h2>

              <div className="mb-8 text-lg text-gray-600 leading-relaxed">
                {/* Reuse description for now, or content if we had a renderer */}
                {service.description}
                {/* If service.content exists, we would render it here */}
              </div>

              {service.features && service.features.length > 0 && (
                <>
                  <h3 className="mb-4 text-xl font-bold text-navy-900">What&apos;s Included</h3>

                  <ul className="mb-8 grid gap-3 md:grid-cols-2">
                    {service.features.map((item, index) => (
                      <li key={item.id || index} className="flex items-center gap-3">
                        <Icon name="check-circle" className="h-5 w-5 shrink-0 text-blue-500" />
                        <span className="text-gray-600">{item.feature}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <Card className="sticky top-32 border border-gray-200" padding="lg">
                <div className="mb-6 text-center">
                  <p className="mb-2 text-sm text-gray-500">Service Starts From</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-navy-900">
                      ${service.price.toLocaleString()}
                    </span>
                    {service.priceUnit && (
                      <span className="text-sm text-gray-500">
                        {priceUnitLabels[service.priceUnit]}
                      </span>
                    )}
                  </div>
                  {service.originalPrice && service.price < service.originalPrice && (
                    <span className="text-lg text-gray-400 line-through">
                      ${service.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>

                <BuyButton serviceId={service.id} />

                <Button variant="outline" href="/contact" className="w-full">
                  Request Quote
                </Button>

                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Icon name="phone" className="h-5 w-5 text-blue-500" />
                    <span>Call us: +1 (555) 123-4567</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Omitted/Simplified as Payload schema doesn't have benefits list with icons yet. 
          Could repurpose other fields or add new field later. */}

      <CTABanner
        heading="Ready to Get Started?"
        description="Contact us today to discuss how this service can help your business."
        ctaText="Schedule Consultation"
        ctaLink="/contact"
        variant="navy"
      />

      <ContactForm
        title="REQUEST A QUOTE"
        subtitle="Fill out the form below and we'll send you a customized quote within 24 hours."
      />
    </>
  )
}
