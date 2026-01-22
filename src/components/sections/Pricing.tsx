import { FC } from 'react'
import { cn } from '@/utils/cn'
import Link from 'next/link'

interface PricingPlan {
  name: string
  price: string
  period?: string
  description?: string
  features: string[]
  isPopular?: boolean
  ctaText?: string
  ctaLink?: string
}

interface PricingProps {
  title?: string
  subtitle?: string
  plans: PricingPlan[]
  className?: string
}

export const Pricing: FC<PricingProps> = ({ title, subtitle, plans, className }) => {
  if (!plans || plans.length === 0) return null

  return (
    <section className={cn('section bg-white', className)}>
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

        <div className="grid gap-8 md:grid-cols-3 lg:gap-12">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg',
                plan.isPopular
                  ? 'border-blue-600 ring-4 ring-blue-600/10 scale-105 z-10'
                  : 'border-gray-200 hover:-translate-y-1',
              )}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-semibold text-white uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              <div className="mb-8 text-center">
                <h3 className="mb-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.description && (
                  <p className="mb-6 text-sm text-gray-500">{plan.description}</p>
                )}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-500">/{plan.period}</span>}
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-600">
                    <svg
                      className="h-5 w-5 shrink-0 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaLink || '/contact'}
                className={cn(
                  'block w-full rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors',
                  plan.isPopular
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200',
                )}
              >
                {plan.ctaText || 'Get Started'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
