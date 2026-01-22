import { FC } from 'react'
import { cn } from '@/utils/cn'

interface ProcessStep {
  title: string
  description: string
  icon?: string // We can expand this to use IconName if needed, keeping simple for now
}

interface ProcessProps {
  title?: string
  steps: ProcessStep[]
  className?: string
}

export const Process: FC<ProcessProps> = ({ title, steps, className }) => {
  if (!steps || steps.length === 0) return null

  return (
    <section className={cn('section bg-white', className)}>
      <div className="container">
        {title && (
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-blue-600" />
          </div>
        )}

        <div className="relative grid gap-8 md:grid-cols-4">
          {/* Connector Line (Desktop) */}
          <div className="absolute top-12 left-0 hidden w-full -translate-y-1/2 transform px-16 md:block">
            <div className="h-0.5 w-full bg-gray-200" />
          </div>

          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center text-center group">
              <div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white border-4 border-gray-100 shadow-sm transition-colors duration-300 group-hover:border-blue-100">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">
                  {index + 1}
                </div>
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
