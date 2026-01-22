import { FC } from 'react'
import { cn } from '@/utils/cn'

interface VideoBlockProps {
  videoUrl?: string // Embed URL or similar
  coverImage?: string
  heading?: string
  description?: string
  className?: string
}

export const VideoBlock: FC<VideoBlockProps> = ({ videoUrl, heading, description, className }) => {
  // Simplistic implementation expecting an embeddable URL or just handling raw video tag if needed
  // For this template, let's assume an iframe-friendly URL (like YouTube embed) is passed
  // or use a placeholder if not provided properly.

  if (!videoUrl) return null

  return (
    <section className={cn('section bg-gray-900 text-white', className)}>
      <div className="container">
        {(heading || description) && (
          <div className="mb-12 text-center">
            {heading && (
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl text-white">
                {heading}
              </h2>
            )}
            {description && (
              <p className="mx-auto max-w-2xl text-lg text-gray-400">{description}</p>
            )}
          </div>
        )}

        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-gray-800 shadow-2xl ring-1 ring-white/10">
          <div className="aspect-video w-full">
            <iframe
              src={videoUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  )
}
