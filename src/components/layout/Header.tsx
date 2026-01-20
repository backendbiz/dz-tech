'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button, Icon } from '@/components/ui'
import { cn } from '@/utils/cn'

interface NavItem {
  label: string
  link: string
  subItems?: { label: string; link: string }[]
}

interface HeaderProps {
  siteName?: string
  logo?: {
    url?: string | null
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
  navItems?: NavItem[]
  ctaButton?: {
    enabled: boolean
    label: string
    link: string
  }
  contactInfo?: {
    phone?: string
    email?: string
    address?: string
  }
}

export function Header({
  siteName = 'Consulting',
  logo,
  navItems = [],
  ctaButton = { enabled: true, label: 'Get Consultation', link: '/contact' },
  contactInfo,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const defaultNavItems: NavItem[] = [
    { label: 'Home', link: '/' },
    { label: 'About', link: '/about' },
    { label: 'Services', link: '/services' },
    { label: 'Projects', link: '/portfolio' },
    { label: 'Contact', link: '/contact' },
  ]

  const navigation = navItems.length > 0 ? navItems : defaultNavItems

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      {/* Top Bar */}
      {contactInfo && (contactInfo.phone || contactInfo.email) && (
        <div className="hidden bg-white py-3 md:block">
          <div className="container flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              {contactInfo.address && (
                <div className="flex items-center gap-2">
                  <Icon name="map-pin" className="h-4 w-4 text-blue-500" />
                  <span>{contactInfo.address}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              {contactInfo.email && (
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="flex items-center gap-2 transition-colors hover:text-blue-500"
                >
                  <Icon name="mail" className="h-4 w-4 text-blue-500" />
                  <span>{contactInfo.email}</span>
                </a>
              )}
              {contactInfo.phone && (
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="flex items-center gap-2 transition-colors hover:text-blue-500"
                >
                  <Icon name="phone" className="h-4 w-4 text-blue-500" />
                  <span>{contactInfo.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className={cn('bg-navy-900 transition-all duration-300', isScrolled && 'shadow-lg')}>
        <div className="container flex h-[70px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-white font-heading tracking-wide">
            {logo?.url ? (
              <Image
                src={logo.url}
                alt={logo.alt || siteName || 'Logo'}
                width={150} // Default width, can be overridden by CSS or prop
                height={60} // Default height
                className="h-12 w-auto object-contain"
              />
            ) : (
              siteName
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <div key={item.label} className="group relative">
                <Link
                  href={item.link}
                  className="flex items-center gap-1 text-sm font-medium uppercase tracking-wider text-white/80 transition-colors hover:text-white"
                >
                  {item.label}
                  {item.subItems && item.subItems.length > 0 && (
                    <Icon
                      name="chevron-down"
                      className="h-4 w-4 transition-transform group-hover:rotate-180"
                    />
                  )}
                </Link>

                {/* Dropdown Menu */}
                {item.subItems && item.subItems.length > 0 && (
                  <div className="invisible absolute left-1/2 top-full mt-2 w-48 -translate-x-1/2 rounded-md bg-white py-2 shadow-xl opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                    {/* Triangle pointer */}
                    <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white"></div>

                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.label}
                        href={subItem.link}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:block">
            {ctaButton.enabled && (
              <Button variant="primary" href={ctaButton.link}>
                {ctaButton.label}
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Menu Drawer Overlay */}
        <div
          className={cn(
            'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 lg:hidden',
            isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
          )}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Mobile Menu Drawer */}
        <div
          className={cn(
            'fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-navy-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="text-lg font-bold text-white font-heading">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <Icon name="x" className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {navigation.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.link}
                    className="block py-2 text-base font-medium uppercase tracking-wider text-white/80 transition-colors hover:text-white"
                    onClick={() => !item.subItems?.length && setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {/* Mobile Submenu */}
                  {item.subItems && item.subItems.length > 0 && (
                    <div className="ml-4 flex flex-col space-y-2 border-l border-white/10 pl-4 mt-2">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.label}
                          href={subItem.link}
                          className="block py-2 text-sm text-white/60 hover:text-white"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {ctaButton.enabled && (
                <div className="pt-4 mt-4 border-t border-white/10">
                  <Button variant="primary" href={ctaButton.link} className="w-full justify-center">
                    {ctaButton.label}
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Contact Info */}
            {contactInfo && (
              <div className="p-6 border-t border-white/10 bg-navy-950/50">
                <div className="space-y-3 text-sm text-white/60">
                  {contactInfo.email && (
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="flex items-center gap-3 hover:text-white"
                    >
                      <Icon name="mail" className="h-4 w-4" />
                      <span>{contactInfo.email}</span>
                    </a>
                  )}
                  {contactInfo.phone && (
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="flex items-center gap-3 hover:text-white"
                    >
                      <Icon name="phone" className="h-4 w-4" />
                      <span>{contactInfo.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
