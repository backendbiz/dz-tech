import Link from 'next/link'
import Image from 'next/image'
import { Icon, type IconName } from '@/components/ui'

interface FooterProps {
  siteName?: string
  logo?: {
    url?: string | null
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
  aboutText?: string
  quickLinks?: { label: string; link: string }[]
  offices?: { city: string; address?: string; phone?: string }[]
  socialLinks?: { platform: string; url: string }[]
  copyrightText?: string
  bottomLinks?: { label: string; link: string }[]
}

export function Footer({
  siteName = 'Consulting',
  logo,
  aboutText = 'We provide professional consulting services to help businesses grow and achieve their goals. Our team of experts is dedicated to delivering exceptional results.',
  quickLinks = [
    { label: 'Home', link: '/' },
    { label: 'About Us', link: '/about' },
    { label: 'Services', link: '/services' },
    { label: 'Contact', link: '/contact' },
  ],
  offices = [
    {
      city: 'New York',
      address: '123 Business Ave, Suite 100',
      phone: '+1 (555) 123-4567',
    },
    {
      city: 'London',
      address: '456 Corporate St, Floor 5',
      phone: '+44 20 1234 5678',
    },
  ],
  socialLinks = [],
  copyrightText = `© ${new Date().getFullYear()} Consulting. All rights reserved.`,
  bottomLinks = [
    { label: 'Privacy Policy', link: '/privacy-policy' },
    { label: 'Terms and Conditions', link: '/terms-and-conditions' },
    { label: 'Refund Policy', link: '/refund-policy' },
  ],
}: FooterProps) {
  const socialIcons: Record<string, IconName> = {
    facebook: 'facebook',
    twitter: 'twitter',
    linkedin: 'linkedin',
    instagram: 'instagram',
    youtube: 'youtube',
  }

  return (
    <footer className="bg-navy-900 text-white">
      {/* Main Footer */}
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-16">
          {/* About Section */}
          <div>
            <Link href="/" className="mb-6 inline-block text-2xl font-bold font-heading">
              {logo?.url ? (
                <Image
                  src={logo.url}
                  alt={logo.alt || siteName || 'Logo'}
                  width={150}
                  height={60}
                  className="h-10 w-auto object-contain brightness-0 invert"
                />
              ) : (
                siteName
              )}
            </Link>
            <p className="mb-6 text-white/70 leading-relaxed">{aboutText}</p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-blue-500"
                    aria-label={social.platform}
                  >
                    <Icon name={socialIcons[social.platform] || 'globe'} className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-6 text-lg font-bold font-heading">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.link}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Offices */}
          <div>
            <h3 className="mb-6 text-lg font-bold font-heading">Our Offices</h3>
            <div className="space-y-6">
              {offices.map((office) => (
                <div key={office.city}>
                  <h4 className="mb-2 font-semibold">{office.city}</h4>
                  {office.address && <p className="text-sm text-white/70">{office.address}</p>}
                  {office.phone && (
                    <a
                      href={`tel:${office.phone}`}
                      className="mt-1 inline-block text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {office.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-sm text-white/60">
            {copyrightText?.replace(/© \d{4}/, `© ${new Date().getFullYear()}`) ||
              `© ${new Date().getFullYear()} Consulting. All rights reserved.`}
          </p>
          {bottomLinks.length > 0 && (
            <div className="flex gap-6">
              {bottomLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.link}
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
