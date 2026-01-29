'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, type StripeElementsOptions, type Stripe } from '@stripe/stripe-js'
import { ReactNode, useMemo } from 'react'

// Cache for Stripe instances by publishable key
const stripeInstanceCache = new Map<string, Promise<Stripe | null>>()

// Get or create a Stripe instance for a given publishable key
function getStripeInstance(publishableKey: string): Promise<Stripe | null> {
  let instance = stripeInstanceCache.get(publishableKey)

  if (!instance) {
    instance = loadStripe(publishableKey)
    stripeInstanceCache.set(publishableKey, instance)
  }

  return instance
}

// Default Stripe promise for backwards compatibility
const defaultStripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface StripeProviderProps {
  clientSecret: string
  children: ReactNode
  /** Optional: Use a different Stripe publishable key (for per-service accounts) */
  publishableKey?: string
}

export function StripeProvider({ clientSecret, children, publishableKey }: StripeProviderProps) {
  // Use the provided publishable key or fall back to default
  const stripePromise = useMemo(() => {
    if (publishableKey && publishableKey !== process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      return getStripeInstance(publishableKey)
    }
    return defaultStripePromise
  }, [publishableKey])

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0099ff',
        colorBackground: '#ffffff',
        colorText: '#0a1f44',
        colorDanger: '#df1b41',
        fontFamily: 'Open Sans, system-ui, sans-serif',
        borderRadius: '8px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          padding: '12px 16px',
          border: '1px solid #e0e0e0',
        },
        '.Input:focus': {
          borderColor: '#0099ff',
          boxShadow: '0 0 0 3px rgba(0, 153, 255, 0.1)',
        },
        '.Label': {
          fontWeight: '600',
          marginBottom: '8px',
        },
        '.Tab': {
          padding: '12px 16px',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        },
        '.Tab--selected': {
          borderColor: '#0099ff',
          backgroundColor: 'rgba(0, 153, 255, 0.05)',
        },
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}
