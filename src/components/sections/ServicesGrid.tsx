'use client'
import { Card, Button, Icon, type IconName } from '@/components/ui'
import { cn } from '@/utils/cn'
import { generateOrderId } from '@/lib/order-generator'
import { useRouter } from 'next/navigation'

interface Service {
  id: string
  slug: string
  title: string
  description: string
  icon?: IconName

  featuredImage?: string | null
  price: number
  originalPrice?: number
  priceUnit?: string
}

interface ServicesGridProps {
  title?: string
  subtitle?: string
  services: Service[]
  showPricing?: boolean
  columns?: 2 | 3
  className?: string
}

import Image from 'next/image'

export function ServicesGrid({
  title = 'OUR SOLUTIONS',
  subtitle,
  services,
  showPricing = true,
  columns = 3,
  className,
}: ServicesGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
  }

  const priceUnitLabels: Record<string, string> = {
    hour: '/hour',
    day: '/day',
    month: '/month',
    project: '/project',
    'one-time': '',
  }

  const router = useRouter()

  return (
    <section className={cn('section bg-white', className)}>
      <div className="container">
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        )}

        <div className={cn('grid gap-8', gridCols[columns])}>
          {services.map((service) => (
            <Card
              key={service.id}
              className="group flex min-h-[400px] flex-col overflow-hidden border border-gray-200 p-0 text-center transition-all hover:shadow-lg"
              padding="none"
            >
              {/* Image or Icon */}
              <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                {service.featuredImage ? (
                  <Image
                    src={service.featuredImage}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blue-500/5">
                    <Icon
                      name={service.icon || 'briefcase'}
                      className="h-16 w-16 text-blue-500/50"
                      strokeWidth={1.5}
                    />
                  </div>
                )}
              </div>

              <div className="flex grow flex-col p-6">
                {/* Title */}
                <h3 className="mb-3 text-xl font-bold text-navy-900">{service.title}</h3>

                {/* Description */}

                <p className="mb-6 grow text-sm text-gray-500 leading-relaxed">
                  {service.description}
                </p>

                {/* Pricing */}
                {showPricing && (
                  <div className="mb-6">
                    <p className="mb-2 text-sm text-gray-500">Service Starts From</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-3xl font-bold text-navy-900">
                        ${service.price.toLocaleString()}
                      </span>
                      {service.priceUnit && (
                        <span className="text-sm text-gray-500">
                          {priceUnitLabels[service.priceUnit]}
                        </span>
                      )}
                      {service.originalPrice && service.originalPrice > service.price && (
                        <span className="text-lg text-gray-400 line-through">
                          ${service.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <div className="mt-auto flex gap-4">
                  <Button variant="primary" href={`/services/${service.slug}`} className="w-full">
                    Learn More
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      const orderId = generateOrderId()
                      router.push(`/checkout?orderId=${orderId}&serviceId=${service.id}`)
                    }}
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
