import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CheckoutClient } from '@/components/checkout/CheckoutClient'
import { getSiteSettings } from '@/lib/queries/globals'

export const metadata: Metadata = {
  title: 'Checkout | DZTech',
  description: 'Complete your purchase securely with our custom checkout experience.',
}

export default async function CheckoutPage() {
  const siteSettings = await getSiteSettings()

  const logo =
    siteSettings.logo && typeof siteSettings.logo === 'object' && 'url' in siteSettings.logo
      ? {
          url: siteSettings.logo.url,
          alt: siteSettings.logo.alt || siteSettings.siteName,
          width: siteSettings.logo.width,
          height: siteSettings.logo.height,
        }
      : null

  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutClient siteName={siteSettings.siteName} logo={logo} />
    </Suspense>
  )
}

function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 mb-4">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Loading checkout...</p>
      </div>
    </div>
  )
}
