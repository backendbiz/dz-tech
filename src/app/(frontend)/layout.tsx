import type { Metadata } from 'next'
import { Montserrat, Open_Sans } from 'next/font/google'
import { Header, Footer, WhatsAppButton } from '@/components/layout'
import { getSiteSettings, getNavigation, getFooter } from '@/lib/queries/globals'
import type { Navigation, Footer as FooterType, SiteSetting } from '@/payload-types'
import './styles.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings()

  const favicon =
    siteSettings.favicon &&
    typeof siteSettings.favicon === 'object' &&
    'url' in siteSettings.favicon
      ? siteSettings.favicon.url
      : null

  return {
    title: {
      default: siteSettings.siteName || 'Consulting',
      template: `%s | ${siteSettings.siteName || 'Consulting'}`,
    },
    description: siteSettings.defaultMetaDescription || 'Professional consulting services.',
    icons: favicon
      ? {
          icon: favicon,
          shortcut: favicon,
        }
      : undefined,
    openGraph: {
      images:
        siteSettings.defaultOgImage &&
        typeof siteSettings.defaultOgImage === 'object' &&
        'url' in siteSettings.defaultOgImage
          ? [{ url: siteSettings.defaultOgImage.url || '' }]
          : undefined,
    },
  }
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const [siteSettings, navigation, footer] = await Promise.all([
    getSiteSettings(),
    getNavigation(),
    getFooter(),
  ])
  type NavItem = NonNullable<Navigation['mainNav']>[number]
  type FooterLink = NonNullable<FooterType['quickLinks']>[number]
  type FooterOffice = NonNullable<FooterType['offices']>[number]
  type FooterBottomLink = NonNullable<FooterType['bottomLinks']>[number]

  // Shared shape for link items to handle various link types from Payload
  type LinkItem = {
    type?: 'internal' | 'external' | null
    internalLink?: string | { slug?: string } | null
    externalLink?: string | null
  }

  const getLink = (item: LinkItem) => {
    if (item.type === 'internal' && item.internalLink) {
      if (typeof item.internalLink === 'string') {
        return `/${item.internalLink}` // Fallback if only ID is present (though unusual for fully populated globals)
      }
      return item.internalLink.slug === 'home' ? '/' : `/${item.internalLink.slug}`
    }
    return item.externalLink || '#'
  }

  // Helper to extract the array element type from a potential array or undefined/null
  type ArrayElement<ArrayType> = ArrayType extends (infer ElementType)[] ? ElementType : never
  type SubItem = ArrayElement<NonNullable<NavItem['subItems']>>

  const navItems =
    navigation.mainNav?.map((item: NavItem) => ({
      label: item.label,
      link: getLink(item as LinkItem),
      subItems: item.subItems?.map((sub: SubItem) => ({
        label: sub.label,
        link: getLink(sub as LinkItem),
      })),
    })) || []

  // Map Footer to Footer Props
  const footerLinks =
    footer.quickLinks?.map((link: FooterLink) => ({
      label: link.label,
      link: getLink(link as LinkItem),
    })) || []

  const officeLocations =
    footer.offices?.map((office: FooterOffice) => ({
      city: office.city,
      address: office.address || undefined,
      phone: office.phone || undefined,
      email: office.email || undefined,
    })) || []

  const bottomLinks =
    footer.bottomLinks?.map((link: FooterBottomLink) => ({
      label: link.label,
      link: getLink(link as LinkItem),
    })) || []

  const socialLinks =
    siteSettings.socialLinks?.map((link: NonNullable<SiteSetting['socialLinks']>[number]) => ({
      platform: link.platform,
      url: link.url,
    })) || []

  const _logoLight =
    siteSettings.logoLight &&
    typeof siteSettings.logoLight === 'object' &&
    'url' in siteSettings.logoLight
      ? {
          url: siteSettings.logoLight.url,
          alt: siteSettings.logoLight.alt || siteSettings.siteName,
          width: siteSettings.logoLight.width,
          height: siteSettings.logoLight.height,
        }
      : null

  const logoDark =
    siteSettings.logoDark &&
    typeof siteSettings.logoDark === 'object' &&
    'url' in siteSettings.logoDark
      ? {
          url: siteSettings.logoDark.url,
          alt: siteSettings.logoDark.alt || siteSettings.siteName,
          width: siteSettings.logoDark.width,
          height: siteSettings.logoDark.height,
        }
      : null

  // Use light logo for dark header background (navy-900)
  const logo = logoDark

  const hasTopBar = siteSettings?.phone || siteSettings?.email
  const paddingTopClass = hasTopBar ? 'pt-[70px] md:pt-[115px]' : 'pt-[70px]'

  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className="antialiased">
        <Header
          siteName={siteSettings.siteName}
          logo={logo}
          navItems={navItems}
          ctaButton={
            navigation.ctaButton
              ? {
                  enabled: navigation.ctaButton.enabled ?? false,
                  label: navigation.ctaButton.label || 'Get Consultation',
                  link: getLink(navigation.ctaButton),
                }
              : undefined
          }
          contactInfo={{
            phone: siteSettings.phone || undefined,
            email: siteSettings.email || undefined,
            address: siteSettings.address || undefined,
          }}
        />
        <main className={paddingTopClass}>{children}</main>
        <Footer
          siteName={siteSettings.siteName}
          logo={logo}
          aboutText={footer.aboutText || undefined}
          quickLinks={footerLinks}
          offices={officeLocations}
          socialLinks={socialLinks}
          copyrightText={footer.copyrightText || undefined}
          bottomLinks={bottomLinks}
        />
        {siteSettings.whatsapp && <WhatsAppButton phoneNumber={siteSettings.whatsapp} />}
      </body>
    </html>
  )
}
