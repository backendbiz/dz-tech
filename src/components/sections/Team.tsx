import { type FC } from 'react'
import Image from 'next/image'
import { cn } from '@/utils/cn'

interface TeamMember {
  name: string
  role: string
  image?: string | null
  bio?: string | null
}

interface TeamProps {
  heading?: string | null
  members: TeamMember[]
  className?: string
}

export const Team: FC<TeamProps> = ({ heading, members, className }) => {
  if (!members || members.length === 0) return null

  return (
    <section className={cn('section bg-gray-50', className)}>
      <div className="container">
        {heading && (
          <div className="mb-12 text-center md:mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {heading}
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded full bg-blue-600" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-6 flex justify-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-gray-50 shadow-inner">
                  {member.image ? (
                    <Image src={member.image} alt={member.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                      <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {member.name}
                </h3>
                <p className="mb-4 text-sm font-medium text-blue-600 uppercase tracking-wide">
                  {member.role}
                </p>
                {member.bio && (
                  <p className="text-sm leading-relaxed text-gray-600">{member.bio}</p>
                )}
              </div>

              {/* Decorative accent */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
