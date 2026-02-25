import React from 'react'
import { getSiteSettings } from '@/lib/queries/globals'
import { LogoClient } from './LogoClient'

export const AdminLogo: React.FC = async () => {
  const settings = await getSiteSettings()
  console.log('settings', settings)

  const darkLogo =
    settings?.logoDark && typeof settings.logoDark === 'object'
      ? (settings.logoDark.url ?? null)
      : null

  const lightLogo =
    settings?.logoLight && typeof settings.logoLight === 'object'
      ? (settings.logoLight.url ?? null)
      : null

  return (
    <LogoClient
      darkLogoUrl={darkLogo}
      lightLogoUrl={lightLogo}
      logoText={settings?.siteName || 'DZ Tech'}
    />
  )
}
