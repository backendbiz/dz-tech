import { Card, Icon, type IconName } from '@/components/ui'
import { cn } from '@/utils/cn'

interface Feature {
  icon: IconName
  title: string
  description: string
}

interface FeaturesProps {
  title?: string
  subtitle?: string
  features: Feature[]
  columns?: 2 | 3 | 4
  background?: 'white' | 'gray'
  className?: string
}

export function Features({
  title,
  subtitle,
  features,
  columns = 4,
  background = 'gray',
  className,
}: FeaturesProps) {
  const gridCols = {
    1: 'grid-cols-1 max-w-lg mx-auto',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  const effectiveColumns = Math.max(1, Math.min(features.length, columns)) as keyof typeof gridCols

  return (
    <section
      className={cn('section', background === 'gray' ? 'bg-gray-100' : 'bg-white', className)}
    >
      <div className="container">
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        )}

        <div className={cn('grid gap-8', gridCols[effectiveColumns])}>
          {features.map((feature, index) => (
            <Card key={index} className="text-center flex flex-col items-center h-full">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                <Icon name={feature.icon} className="h-8 w-8 text-blue-500" strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-navy-900">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
