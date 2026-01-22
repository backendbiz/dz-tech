import { FC } from 'react'
import { cn } from '@/utils/cn'

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  title?: string
  subtitle?: string
  faqs: FAQItem[]
  className?: string
}

export const FAQ: FC<FAQProps> = ({ title, subtitle, faqs, className }) => {
  if (!faqs || faqs.length === 0) return null

  return (
    <section className={cn('section bg-gray-50', className)}>
      <div className="container max-w-3xl">
        {(title || subtitle) && (
          <div className="mb-12 text-center md:mb-16">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && <p className="mx-auto mt-4 text-lg text-gray-600">{subtitle}</p>}
          </div>
        )}

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group rounded-xl bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-gray-900 hover:text-blue-600 transition-colors">
                <span className="text-lg font-semibold">{faq.question}</span>
                <span className="ml-4 shrink-0 rounded-full border border-gray-200 bg-white p-1.5 text-gray-900 sm:p-3 transition duration-300 group-open:-rotate-180">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </summary>

              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
