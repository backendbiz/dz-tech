'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { generateOrderId } from '@/lib/order-generator'

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
      // Generate a unique order ID
      const orderId = generateOrderId()

      // Redirect to custom checkout page with serviceId
      const checkoutUrl = `/checkout?orderId=${orderId}&serviceId=${serviceId}`

      router.push(checkoutUrl)
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
