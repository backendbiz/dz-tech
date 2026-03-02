'use client'

import { Button, Icon } from '@/components/ui'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
          <Icon name="x" className="h-12 w-12 text-red-500" strokeWidth={1.5} />
        </div>
        <h1 className="mb-4 text-2xl font-bold text-navy-900">Something went wrong!</h1>
        <p className="mb-8 max-w-md text-gray-500">
          We apologize for the inconvenience. Please try again or contact support if the problem
          persists.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button variant="default" onClick={() => reset()}>
            Try Again
          </Button>
          <Button variant="outline" href="/">
            Go to Homepage
          </Button>
        </div>
      </div>
    </div>
  )
}
