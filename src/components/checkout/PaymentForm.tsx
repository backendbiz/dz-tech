'use client'

import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState, FormEvent } from 'react'
import { Button, Icon } from '@/components/ui'

interface PaymentFormProps {
  orderId: string
  amount: number
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function PaymentForm({ orderId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    const origin = window.location.origin

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${origin}/checkout/success?orderId=${orderId}`,
      },
    })

    if (error) {
      // This point will only be reached if there's an immediate error
      // For async payment methods like Cash App, the customer is redirected
      setErrorMessage(error.message || 'An unexpected error occurred.')
      onError?.(error.message || 'Payment failed')
      setIsProcessing(false)
    } else {
      // Payment succeeded - this usually doesn't happen for redirect-based methods
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element - Only shows Cash App */}
      <div className="rounded-xl border border-gray-200 p-4 bg-white">
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['cashapp'],
            business: {
              name: 'DZTech',
            },
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <Icon name="alert-circle" className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full py-4 text-base"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Icon name="lock" className="h-4 w-4" />
            Pay ${amount.toLocaleString()} with Cash App
          </span>
        )}
      </Button>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Icon name="shield" className="h-4 w-4 text-green-500" />
        <span>Secure payment powered by Stripe</span>
      </div>
    </form>
  )
}
