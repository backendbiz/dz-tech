import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CheckoutTokenClient } from '@/components/checkout/CheckoutTokenClient'

export const metadata: Metadata = {
  title: 'Checkout | DZTech',
  description: 'Complete your purchase securely with our custom checkout experience.',
}

interface CheckoutTokenPageProps {
  params: Promise<{ token: string }>
}

export default async function CheckoutTokenPage({ params }: CheckoutTokenPageProps) {
  const { token } = await params

  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutTokenClient token={token} />
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
