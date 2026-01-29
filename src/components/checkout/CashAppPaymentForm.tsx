'use client'

import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState, FormEvent } from 'react'
import { Icon } from '@/components/ui'

interface CashAppPaymentFormProps {
  orderId: string
  amount: number
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function CashAppPaymentForm({
  orderId,
  amount,
  onSuccess,
  onError,
}: CashAppPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
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
      setErrorMessage(error.message || 'An unexpected error occurred.')
      onError?.(error.message || 'Payment failed')
      setIsProcessing(false)
    } else {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cash App Only Payment Element */}
      <div>
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            paymentMethodOrder: ['cashapp', 'card'],
            business: {
              name: 'DZTech',
            },
            wallets: {
              applePay: 'never',
              googlePay: 'never',
            },
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <Icon name="alert-circle" className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Pay Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 px-6 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-lg shadow-lg shadow-blue-500/25"
      >
        {isProcessing ? (
          <>
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay USD {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
        )}
      </button>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Icon name="lock" className="h-4 w-4 text-green-500" />
        <span className="text-xs text-gray-500">Secure, fast checkout with Cash App</span>
      </div>
    </form>
  )
}
