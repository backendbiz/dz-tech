import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SuccessClient } from './SuccessClient'

export const metadata: Metadata = {
  title: 'Payment Successful | DZTech',
  description: 'Your payment has been processed successfully.',
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <SuccessClient />
    </Suspense>
  )
}

function SuccessLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
          <div className="h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Loading confirmation...</p>
      </div>
    </div>
  )
}
