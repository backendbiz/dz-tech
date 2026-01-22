import { FC } from 'react'
import Image from 'next/image'
import { cn } from '@/utils/cn'

interface Testimonial {
  name: string
  role: string
  company?: string
  quote: string
  image?: string | null
  rating?: number
}

interface TestimonialsProps {
  title?: string
  subtitle?: string
  testimonials: Testimonial[]
  className?: string
}

export const Testimonials: FC<TestimonialsProps> = ({
  title,
  subtitle,
  testimonials,
  className,
}) => {
  if (!testimonials || testimonials.length === 0) return null

  return (
    <section className={cn('section bg-gray-50', className)}>
      <div className="container">
        {(title || subtitle) && (
          <div className="mb-12 text-center md:mb-16">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{subtitle}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex flex-col rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-6 flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={cn(
                      'h-5 w-5',
                      i < (testimonial.rating || 5) ? 'text-yellow-400' : 'text-gray-200',
                    )}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <blockquote className="mb-6 flex-1 text-lg leading-relaxed text-gray-700">
                &quot;{testimonial.quote}&quot;
              </blockquote>

              <div className="flex items-center gap-4">
                {testimonial.image ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">
                    {testimonial.role}
                    {testimonial.company && (
                      <>
                        <span className="mx-1">•</span>
                        {testimonial.company}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
