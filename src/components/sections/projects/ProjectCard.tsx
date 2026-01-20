'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Project } from '@/payload-types'
import { cn } from '@/utils/cn'

interface ProjectCardProps {
  project: Project
  className?: string
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, className }) => {
  const { title, client, featuredImage, slug } = project

  // Helper to ensure we have a valid image URL
  const imageUrl =
    featuredImage && typeof featuredImage === 'object' && featuredImage.url
      ? featuredImage.url
      : '/placeholder-project.jpg' // You might want to generate a real placeholder or use a default one

  const altText =
    featuredImage && typeof featuredImage === 'object' && featuredImage.alt
      ? featuredImage.alt
      : title

  return (
    <Link
      href={`/portfolio/${slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
        className,
      )}
    >
      {/* Image Container */}
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={altText}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-navy-900/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-40" />
      </div>

      {/* Content */}
      <div className="relative p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-500 uppercase tracking-wider">
            {client || 'Client Project'}
          </span>
        </div>

        <h3 className="mb-2 text-xl font-bold text-navy-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        <div className="mt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          View Case Study <span className="ml-1">→</span>
        </div>
      </div>
    </Link>
  )
}
