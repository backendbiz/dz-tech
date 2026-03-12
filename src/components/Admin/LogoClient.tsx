'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

interface LogoClientProps {
  darkLogoUrl: string | null
  lightLogoUrl: string | null
  logoText: string
}

export const LogoClient: React.FC<LogoClientProps> = ({ darkLogoUrl, lightLogoUrl, logoText }) => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(isDark)
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkDarkMode)
    }
  }, [])

  const getLogoUrl = (): string | null => {
    if (isDarkMode && darkLogoUrl) return darkLogoUrl
    if (lightLogoUrl) return lightLogoUrl
    if (darkLogoUrl) return darkLogoUrl
    return null
  }

  const logoUrl = getLogoUrl()

  return (
    <div className="flex items-center gap-2 text-lg font-semibold text-(--theme-text)">
      {logoUrl ? (
        <div className="relative h-7 w-auto min-w-7">
          <Image
            src={logoUrl}
            alt={logoText}
            height={25}
            width={200}
            className="h-7 w-auto object-contain"
            unoptimized
          />
        </div>
      ) : (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <rect width="28" height="28" rx="6" fill="var(--theme-success-500)" />
          <path
            d="M8 14L12 18L20 10"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}
