import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import Image from 'next/image'

interface HeroProps {
  title: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
  secondaryCta?: {
    text: string
    link: string
  }
  backgroundImage?: string
  variant?: 'home' | 'page' | 'simple' | 'minimal'
  className?: string
}

export function Hero({
  title,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCta,
  backgroundImage,
  variant = 'home',
  className,
}: HeroProps) {
  const isHome = variant === 'home'

  return (
    <section
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        isHome ? 'min-h-[700px]' : 'min-h-[300px]',
        'bg-navy-900',
        className,
      )}
    >
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0">
          <Image src={backgroundImage} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-navy-900/70" />
        </div>
      )}

      {/* Network Pattern Overlay */}
      <div className="absolute inset-0 opacity-30">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="network-pattern"
              x="0"
              y="0"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="10" cy="10" r="2" fill="rgba(0, 153, 255, 0.3)" />
              <circle cx="90" cy="10" r="2" fill="rgba(0, 153, 255, 0.3)" />
              <circle cx="50" cy="50" r="2" fill="rgba(0, 153, 255, 0.3)" />
              <circle cx="10" cy="90" r="2" fill="rgba(0, 153, 255, 0.3)" />
              <circle cx="90" cy="90" r="2" fill="rgba(0, 153, 255, 0.3)" />
              <line
                x1="10"
                y1="10"
                x2="50"
                y2="50"
                stroke="rgba(0, 153, 255, 0.2)"
                strokeWidth="1"
              />
              <line
                x1="90"
                y1="10"
                x2="50"
                y2="50"
                stroke="rgba(0, 153, 255, 0.2)"
                strokeWidth="1"
              />
              <line
                x1="10"
                y1="90"
                x2="50"
                y2="50"
                stroke="rgba(0, 153, 255, 0.2)"
                strokeWidth="1"
              />
              <line
                x1="90"
                y1="90"
                x2="50"
                y2="50"
                stroke="rgba(0, 153, 255, 0.2)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#network-pattern)" />
        </svg>
      </div>

      {/* Content */}
      <div className="container relative z-10 text-center">
        <h1
          className={cn(
            'mx-auto max-w-4xl font-bold text-white',
            isHome ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-3xl md:text-4xl lg:text-5xl',
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 md:text-xl">{subtitle}</p>
        )}
        {(ctaText || secondaryCta) && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {ctaText && ctaLink && (
              <Button variant="primary" size="lg" href={ctaLink}>
                {ctaText}
              </Button>
            )}
            {secondaryCta && (
              <Button variant="outline" size="lg" href={secondaryCta.link}>
                {secondaryCta.text}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Gradient Overlay at Bottom */}
      {/* {isHome && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white to-transparent" />
      )} */}
    </section>
  )
}
