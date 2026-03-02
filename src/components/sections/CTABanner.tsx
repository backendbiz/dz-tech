import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

interface CTABannerProps {
  heading: string
  description?: string
  ctaText?: string
  ctaLink?: string
  secondaryCta?: {
    text: string
    link: string
  }
  variant?: 'navy' | 'blue' | 'light'
  className?: string
}

export function CTABanner({
  heading,
  description,
  ctaText,
  ctaLink,
  secondaryCta,
  variant = 'navy',
  className,
}: CTABannerProps) {
  const variants = {
    navy: 'bg-navy-900 text-white',
    blue: 'bg-blue-500 text-white',
    light: 'bg-gray-100 text-navy-900',
  }

  return (
    <section className={cn('py-16 md:py-20', variants[variant], className)}>
      <div className="container text-center">
        <h2
          className={cn(
            'mx-auto max-w-3xl text-3xl font-bold md:text-4xl',
            variant === 'light' ? 'text-navy-900' : 'text-white',
          )}
        >
          {heading}
        </h2>
        {description && (
          <p
            className={cn(
              'mx-auto mt-4 max-w-2xl text-lg',
              variant === 'light' ? 'text-gray-600' : 'text-white/80',
            )}
          >
            {description}
          </p>
        )}
        {(ctaText || secondaryCta) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {ctaText && ctaLink && (
              <Button
                variant={variant === 'light' ? 'default' : 'default'}
                size="lg"
                href={ctaLink}
              >
                {ctaText}
              </Button>
            )}
            {secondaryCta && (
              <Button
                variant="outline"
                size="lg"
                href={secondaryCta.link}
                className={
                  variant !== 'light'
                    ? 'border-white text-white hover:bg-white hover:text-navy-900'
                    : ''
                }
              >
                {secondaryCta.text}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
