'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

interface BuyButtonProps {
  serviceId: string | number
  label?: string
}

export function BuyButton({ serviceId, label = 'Get Started' }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleBuy = async () => {
    setLoading(true)
    try {
      // Create payment intent and get a secure checkout token
      const response = await fetch('/api/v1/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()

      // Redirect to token-based checkout URL
      if (data.checkoutToken) {
        router.push(`/checkout/o/${data.checkoutToken}`)
      } else {
        throw new Error('No checkout token received')
      }
    } catch (error) {
      console.error('Error initiating checkout:', error)
      setLoading(false)
    }
  }

  return (
    <Button variant="primary" className="mb-4 w-full" onClick={handleBuy} disabled={loading}>
      {loading ? 'Processing...' : label}
    </Button>
  )
}
