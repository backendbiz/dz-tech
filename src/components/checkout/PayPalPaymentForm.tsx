'use client'

import { useState } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'

interface PayPalPaymentFormProps {
  serviceId: string
  orderId: string
  amount: number
  onSuccess?: (paypalOrderId: string) => void
  onError?: (error: string) => void
  returnUrl?: string
}

export function PayPalPaymentForm({
  serviceId,
  orderId,
  amount,
  onSuccess,
  onError,
  returnUrl,
}: PayPalPaymentFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (!clientId) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500 text-sm">PayPal is not configured.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {processing && (
        <div className="text-center py-2">
          <p className="text-gray-600 text-sm">Processing payment...</p>
        </div>
      )}

      <PayPalScriptProvider
        options={{
          clientId,
          currency: 'USD',
          intent: 'capture',
        }}
      >
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
          }}
          disabled={processing}
          createOrder={async () => {
            try {
              setError(null)
              setProcessing(true)

              const response = await fetch('/api/v1/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  serviceId,
                  orderId,
                  amount,
                }),
              })

              const data = await response.json()

              if (!response.ok) {
                throw new Error(data.error || 'Failed to create PayPal order')
              }

              return data.paypalOrderId
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to create order'
              setError(message)
              setProcessing(false)
              onError?.(message)
              throw err
            }
          }}
          onApprove={async (data) => {
            try {
              const response = await fetch('/api/v1/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paypalOrderId: data.orderID,
                  orderId,
                }),
              })

              const result = await response.json()

              if (!response.ok) {
                throw new Error(result.error || 'Failed to capture payment')
              }

              setProcessing(false)
              onSuccess?.(data.orderID)

              // Navigate to show success state
              // Use returnUrl if provided, otherwise reload current page
              if (returnUrl) {
                window.location.href = returnUrl
              } else {
                window.location.reload()
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Payment capture failed'
              setError(message)
              setProcessing(false)
              onError?.(message)
            }
          }}
          onCancel={() => {
            setProcessing(false)
            setError('Payment was cancelled. You can try again.')
          }}
          onError={(err) => {
            console.error('PayPal error:', err)
            setProcessing(false)
            setError('An error occurred with PayPal. Please try again.')
            onError?.('PayPal error')
          }}
        />
      </PayPalScriptProvider>

      <p className="text-center text-xs text-gray-400 mt-2">
        Secured by <span className="font-medium">PayPal</span>
      </p>
    </div>
  )
}
