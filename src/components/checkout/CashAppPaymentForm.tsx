'use client'

import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { StripePaymentElementChangeEvent } from '@stripe/stripe-js'
import { useState, useCallback, useRef, FormEvent, useEffect } from 'react'
import { Icon } from '@/components/ui'

interface CashAppPaymentFormProps {
  orderId: string
  amount: number
  returnUrl?: string
  onSuccess?: () => void
  onError?: (error: string, errorCode?: string) => void
  onAnalytics?: (event: PaymentAnalyticsEvent) => void
  onCancel?: () => void
  isCancelling?: boolean
}

type PaymentAnalyticsEvent =
  | { type: 'payment_initiated'; orderId: string; amount: number }
  | { type: 'payment_method_selected'; method: string }
  | { type: 'payment_validation_error'; error: string }
  | { type: 'payment_error'; error: string; errorCode?: string; retryCount: number }
  | { type: 'payment_processing'; orderId: string }
  | { type: 'payment_success'; orderId: string; processingTime: number }

type ErrorCategory =
  | 'card_error'
  | 'validation_error'
  | 'network_error'
  | 'timeout_error'
  | 'unknown'

interface PaymentError {
  message: string
  category: ErrorCategory
  code?: string
  retryable: boolean
}

export function CashAppPaymentForm({
  orderId,
  amount,
  returnUrl,
  onSuccess,
  onError,
  onAnalytics,
  onCancel,
  isCancelling,
}: CashAppPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [selectedMethod, setSelectedMethod] = useState<string>('cashapp')

  const abortControllerRef = useRef<AbortController | null>(null)
  const processingStartTimeRef = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Track initial mount
  useEffect(() => {
    onAnalytics?.({ type: 'payment_initiated', orderId, amount })
  }, [orderId, amount, onAnalytics])

  // Categorize errors for better UX
  const categorizeError = useCallback(
    (error: { type?: string; code?: string; message?: string }): PaymentError => {
      const { type, code, message } = error

      if (type === 'api_connection_error' || type === 'timeout') {
        return {
          message: 'Connection issue. Please check your internet and try again.',
          category: 'network_error',
          code,
          retryable: true,
        }
      }

      if (type === 'card_error') {
        const retryable = ['card_declined', 'processing_error'].includes(code || '')
        return {
          message: message || 'Your card was declined. Please try a different payment method.',
          category: 'card_error',
          code,
          retryable,
        }
      }

      if (type === 'validation_error') {
        return {
          message: message || 'Please check your payment details and try again.',
          category: 'validation_error',
          code,
          retryable: false,
        }
      }

      return {
        message: message || 'An unexpected error occurred. Please try again.',
        category: 'unknown',
        code,
        retryable: true,
      }
    },
    [],
  )

  const handleElementChange = useCallback(
    (event: StripePaymentElementChangeEvent) => {
      setIsComplete(event.complete)

      if (event.value?.type && event.value.type !== selectedMethod) {
        setSelectedMethod(event.value.type)
        onAnalytics?.({ type: 'payment_method_selected', method: event.value.type })
      }
    },
    [selectedMethod, onAnalytics],
  )

  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1)
    setErrorMessage(null)
    setErrorCategory(null)
    elements?.getElement('payment')?.focus()
  }, [elements])

  const formatAmount = useCallback(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }, [amount])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!stripe || !elements || !isComplete) {
        return
      }

      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsProcessing(true)
      setErrorMessage(null)
      processingStartTimeRef.current = Date.now()

      onAnalytics?.({ type: 'payment_processing', orderId })

      const origin = window.location.origin
      const finalReturnUrl = returnUrl || `${origin}/checkout?orderId=${orderId}`

      try {
        const { error: submitError } = await elements.submit()
        if (submitError) {
          throw submitError
        }

        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: finalReturnUrl,
            receipt_email: undefined,
          },
        })

        if (confirmError) {
          throw confirmError
        }

        const processingTime = Date.now() - processingStartTimeRef.current
        onAnalytics?.({ type: 'payment_success', orderId, processingTime })
        onSuccess?.()
      } catch (err: unknown) {
        const error = err as {
          type?: string
          code?: string
          message?: string
          decline_code?: string
        }
        const categorized = categorizeError(error)

        setErrorMessage(categorized.message)
        setErrorCategory(categorized.category)

        onAnalytics?.({
          type: 'payment_error',
          error: categorized.message,
          errorCode: categorized.code,
          retryCount,
        })
        onError?.(categorized.message, categorized.code)

        setIsProcessing(false)
      }
    },
    [
      stripe,
      elements,
      isComplete,
      orderId,
      returnUrl,
      onSuccess,
      onError,
      onAnalytics,
      retryCount,
      categorizeError,
    ],
  )

  const getHelperText = () => {
    switch (selectedMethod) {
      case 'cashapp':
        return 'Fast, secure payments from your Cash App balance'
      case 'card':
        return 'Pay with any major credit or debit card'
      case 'link':
        return 'Pay instantly with your saved payment info'
      default:
        return 'Secure, encrypted payment processing'
    }
  }

  const ErrorDisplay = () => {
    if (!errorMessage) return null

    const isRetryable =
      errorCategory === 'network_error' ||
      errorCategory === 'card_error' ||
      errorCategory === 'unknown'

    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Icon name="alert-circle" className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Payment Error</p>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        </div>

        {isRetryable && retryCount < 3 && (
          <div className="flex items-center gap-2 pl-8">
            <button
              type="button"
              onClick={handleRetry}
              className="text-sm font-medium text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
            {retryCount > 0 && (
              <span className="text-xs text-red-500">(Attempt {retryCount + 1}/3)</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Payment Element with onChange for real-time validation */}
      <div className="space-y-2">
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            paymentMethodOrder: ['cashapp', 'card', 'link'],
            business: { name: 'DZTech' },
            wallets: { applePay: 'never', googlePay: 'never' },
            fields: { billingDetails: 'auto' },
            terms: { card: 'auto', cashapp: 'never' },
          }}
          onChange={handleElementChange}
        />
        <p className="text-xs text-gray-500 px-1">{getHelperText()}</p>
      </div>

      {/* Error Display with Retry */}
      <ErrorDisplay />

      {/* Pay Button with Smart States */}
      <button
        type="submit"
        disabled={!stripe || isProcessing || !isComplete}
        className="w-full py-4 px-6 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 active:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
      >
        {isProcessing ? (
          <>
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        ) : !isComplete ? (
          <>
            <Icon name="shield" className="h-5 w-5" />
            <span>Complete payment info</span>
          </>
        ) : (
          <>
            <Icon name="lock" className="h-5 w-5" />
            <span>Pay {formatAmount()}</span>
          </>
        )}
      </button>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <div className="flex items-center gap-1.5">
          <Icon name="lock" className="h-4 w-4 text-green-500" />
          <span className="text-xs text-gray-500">SSL Encrypted</span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-1.5">
          <Icon name="check-circle" className="h-4 w-4 text-green-500" />
          <span className="text-xs text-gray-500">Stripe Verified</span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-1.5">
          <Icon name="lightbulb" className="h-4 w-4 text-green-500" />
          <span className="text-xs text-gray-500">Instant</span>
        </div>
      </div>

      {/* Cancel Button */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isProcessing || isCancelling}
        className="w-full py-3 px-4 text-red-600 font-medium rounded-xl hover:bg-red-50 disabled:text-red-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
      >
        {isCancelling ? (
          <>
            <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            <span>Cancelling...</span>
          </>
        ) : (
          <>
            <Icon name="x" className="h-4 w-4" />
            <span>Cancel Payment</span>
          </>
        )}
      </button>
    </form>
  )
}
