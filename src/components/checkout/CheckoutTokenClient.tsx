'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Icon, Card } from '@/components/ui'
import type { IconName } from '@/components/ui'
import Link from 'next/link'
import { StripeProvider } from '@/components/checkout/StripeProvider'
import { CashAppPaymentForm } from '@/components/checkout/CashAppPaymentForm'
import { PayPalPaymentForm } from '@/components/checkout/PayPalPaymentForm'

type PaymentMethodType = 'cashapp' | 'paypal'

interface ServiceData {
  id: string
  title: string
  description: string
  price: number
  priceUnit?: string
  icon?: IconName
  slug: string
}

interface CheckoutState {
  loading: boolean
  error: string | null
  errorCode: string | null
  service: ServiceData | null
  clientSecret: string | null
  paymentOrderId: string | null
  stripePublishableKey: string | null
  provider: string | null
  successRedirectUrl: string | null
  cancelRedirectUrl: string | null
  serviceId: string | null
  allowedPaymentMethods: PaymentMethodType[]
}

// Payment result status from Stripe redirect
type PaymentResultStatus = 'succeeded' | 'processing' | 'failed' | null

interface CheckoutSessionData {
  clientSecret: string
  orderId: string
  checkoutToken: string
  status?: 'paid' | 'failed' | 'disputed' | 'refunded' | 'pending'
  amount: number
  quantity?: number
  serviceName?: string
  serviceId: string
  stripePublishableKey?: string
  service: ServiceData
  provider?: string
  successRedirectUrl?: string
  cancelRedirectUrl?: string
  allowedPaymentMethods?: PaymentMethodType[]
  paymentMethod?: PaymentMethodType | null
}

interface CheckoutTokenClientProps {
  token: string
}

/**
 * Replace {orderId} placeholder in URL with actual orderId
 */
function buildRedirectUrl(templateUrl: string, orderId: string): string {
  return templateUrl.replace(/{orderId}/g, orderId)
}

export function CheckoutTokenClient({ token }: CheckoutTokenClientProps) {
  const searchParams = useSearchParams()

  // Stripe redirect params (added after Cash App payment)
  const redirectStatus = searchParams.get('redirect_status') as PaymentResultStatus
  const paymentIntentParam = searchParams.get('payment_intent')
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')

  const [state, setState] = useState<CheckoutState>({
    loading: true,
    error: null,
    errorCode: null,
    service: null,
    clientSecret: null,
    paymentOrderId: null,
    stripePublishableKey: null,
    provider: null,
    successRedirectUrl: null,
    cancelRedirectUrl: null,
    serviceId: null,
    allowedPaymentMethods: ['cashapp', 'paypal'],
  })

  const [copied, setCopied] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  // Actual payment status (verified from PaymentIntent, not just redirect_status)
  const [paymentStatus, setPaymentStatus] = useState<
    'succeeded' | 'processing' | 'failed' | 'pending' | 'disputed' | null
  >(null)
  // The confirmed payment method (persisted on the order)
  const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState<PaymentMethodType | null>(
    null,
  )
  // Hover selection before confirming
  const [hoveredPaymentMethod, setHoveredPaymentMethod] = useState<PaymentMethodType | null>(null)
  const [selectingMethod, setSelectingMethod] = useState(false)
  const [initializingStripe, setInitializingStripe] = useState(false)
  const [stripeInitError, setStripeInitError] = useState<string | null>(null)

  // Lazily create Stripe PaymentIntent when user selects Cash App and none exists
  const initializeStripePayment = useCallback(async () => {
    if (state.clientSecret || !state.paymentOrderId || initializingStripe) return
    setInitializingStripe(true)
    setStripeInitError(null)
    try {
      const res = await fetch('/api/v1/initialize-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: state.paymentOrderId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to initialize Cash App payment')
      }
      const data = await res.json()
      setState((prev) => ({ ...prev, clientSecret: data.clientSecret }))
    } catch (err) {
      console.error('Failed to initialize Stripe payment:', err)
      setStripeInitError(err instanceof Error ? err.message : 'Failed to initialize payment')
    } finally {
      setInitializingStripe(false)
    }
  }, [state.clientSecret, state.paymentOrderId, initializingStripe])

  // When Cash App is confirmed, trigger lazy Stripe PI creation if needed
  useEffect(() => {
    if (
      confirmedPaymentMethod === 'cashapp' &&
      !state.clientSecret &&
      state.paymentOrderId &&
      !paymentStatus
    ) {
      initializeStripePayment()
    }
  }, [
    confirmedPaymentMethod,
    state.clientSecret,
    state.paymentOrderId,
    paymentStatus,
    initializeStripePayment,
  ])

  // Fetch checkout session by token
  useEffect(() => {
    async function initializeCheckout() {
      if (!token) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Invalid checkout link.',
        }))
        return
      }

      try {
        const response = await fetch(`/api/v1/checkout-session/${token}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load checkout session')
        }

        const data: CheckoutSessionData = await response.json()

        // Check if order is already processed
        if (data.status === 'paid') {
          setPaymentStatus('succeeded')
        } else if (data.status === 'failed') {
          setPaymentStatus('failed')
        } else if (data.status === 'disputed' || data.status === 'refunded') {
          setPaymentStatus('disputed')
        }

        const allowed = data.allowedPaymentMethods || ['cashapp', 'paypal']

        setState((prev) => ({
          ...prev,
          loading: false,
          service: data.service,
          clientSecret: data.clientSecret,
          paymentOrderId: data.orderId,
          stripePublishableKey: data.stripePublishableKey || null,
          provider: data.provider || null,
          successRedirectUrl: data.successRedirectUrl || null,
          cancelRedirectUrl: data.cancelRedirectUrl || null,
          serviceId: data.serviceId || null,
          allowedPaymentMethods: allowed,
        }))

        // If the user already selected a payment method (persisted on order),
        // go straight to the checkout form. Otherwise they'll see the selection page.
        if (data.paymentMethod) {
          setConfirmedPaymentMethod(data.paymentMethod)
        }
      } catch (error) {
        console.error('Checkout initialization error:', error)
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize checkout',
        }))
      }
    }

    initializeCheckout()
  }, [token])

  // Verify actual PaymentIntent status when returning from Cash App redirect
  useEffect(() => {
    async function verifyPaymentStatus() {
      if (!paymentIntentParam || !paymentIntentClientSecret) return

      try {
        const { loadStripe } = await import('@stripe/stripe-js')
        const publishableKey =
          state.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

        if (!publishableKey) {
          console.error('No Stripe publishable key available')
          setPaymentStatus(
            redirectStatus === 'succeeded'
              ? 'succeeded'
              : redirectStatus === 'failed'
                ? 'failed'
                : 'pending',
          )
          return
        }

        const stripe = await loadStripe(publishableKey)
        if (!stripe) {
          console.error('Failed to load Stripe')
          setPaymentStatus(
            redirectStatus === 'succeeded'
              ? 'succeeded'
              : redirectStatus === 'failed'
                ? 'failed'
                : 'pending',
          )
          return
        }

        const { paymentIntent, error } =
          await stripe.retrievePaymentIntent(paymentIntentClientSecret)

        if (error) {
          console.error('Error retrieving PaymentIntent:', error)
          setPaymentStatus('failed')
          return
        }

        if (paymentIntent) {
          console.log('PaymentIntent status:', paymentIntent.status)
          switch (paymentIntent.status) {
            case 'succeeded':
              setPaymentStatus('succeeded')
              break
            case 'processing':
              setPaymentStatus('processing')
              break
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
            case 'canceled':
              setPaymentStatus('failed')
              break
            default:
              setPaymentStatus('pending')
          }
        }
      } catch (err) {
        console.error('Error verifying payment status:', err)
        setPaymentStatus(redirectStatus === 'succeeded' ? 'succeeded' : 'failed')
      }
    }

    verifyPaymentStatus()
  }, [paymentIntentParam, paymentIntentClientSecret, redirectStatus, state.stripePublishableKey])

  // Handle payment success - check for provider redirect
  useEffect(() => {
    if (paymentStatus === 'succeeded' && state.paymentOrderId) {
      if (state.successRedirectUrl && state.provider) {
        setRedirecting(true)
      }
    }
  }, [paymentStatus, state.paymentOrderId, state.successRedirectUrl, state.provider])

  // Handle provider redirect with countdown
  useEffect(() => {
    if (!redirecting || !state.successRedirectUrl || !state.paymentOrderId) return

    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          const redirectUrl = buildRedirectUrl(state.successRedirectUrl!, state.paymentOrderId!)
          window.location.href = redirectUrl
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [redirecting, state.successRedirectUrl, state.paymentOrderId])

  const handleRedirectNow = useCallback(() => {
    if (state.successRedirectUrl && state.paymentOrderId) {
      const redirectUrl = buildRedirectUrl(state.successRedirectUrl, state.paymentOrderId)
      window.location.href = redirectUrl
    }
  }, [state.successRedirectUrl, state.paymentOrderId])

  const copyOrderId = useCallback(() => {
    if (state.paymentOrderId) {
      navigator.clipboard.writeText(state.paymentOrderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [state.paymentOrderId])

  const displayOrderId = state.paymentOrderId

  // Show verifying payment status (when we have redirect params but haven't verified yet)
  if (paymentIntentParam && paymentStatus === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Verifying payment status...</p>
        </div>
      </div>
    )
  }

  // Show payment success with provider redirect
  if (paymentStatus === 'succeeded' && redirecting && state.provider) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border border-green-200 shadow-lg">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
            <Icon name="check-circle" className="h-12 w-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful!</h1>

          {/* Order ID */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Order Reference</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono font-bold text-gray-900 text-sm truncate max-w-48">
                {displayOrderId}
              </span>
              <button
                onClick={copyOrderId}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Copy Order ID"
              >
                <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Redirect message */}
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              Redirecting you back to <span className="font-semibold">{state.provider}</span>...
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span>Redirecting in {redirectCountdown} seconds</span>
            </div>
          </div>

          <button
            onClick={handleRedirectNow}
            className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
          >
            Continue to {state.provider} Now
          </button>

          <p className="mt-4 text-xs text-gray-400">
            Powered by <span className="font-medium text-blue-500">DZTech</span>
          </p>
        </Card>
      </div>
    )
  }

  // Show payment success (no provider redirect)
  if (paymentStatus === 'succeeded') {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="text-center border border-green-200 overflow-hidden shadow-xl">
            {/* Success Header */}
            <div className="bg-linear-to-br from-green-500 to-green-600 px-8 py-10">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-6">
                <Icon name="check-circle" className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Payment Successful!</h1>
              <p className="text-white/90 text-lg">Thank you for your purchase</p>
            </div>

            {/* Order Details */}
            <div className="px-8 py-8">
              {/* Order ID */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">Your Order Reference</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono font-bold text-lg text-gray-900 truncate max-w-xs">
                    {displayOrderId}
                  </span>
                  <button
                    onClick={copyOrderId}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6 text-center text-xs text-gray-400">
            <p>© 2026 DZTech. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  // Show payment processing
  if (paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border border-blue-200 shadow-lg p-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 mb-6">
            <Icon name="clock" className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Processing</h1>
          <p className="text-gray-600 mb-6">
            Your payment is being processed. We&apos;ll notify you once it&apos;s complete.
          </p>

          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Order Reference</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono font-bold text-gray-900 text-sm">{displayOrderId}</span>
              <button
                onClick={copyOrderId}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label="Copy order ID"
                title="Copy order ID"
              >
                <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Show payment failed
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border border-red-200 shadow-lg p-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
            <Icon name="alert-circle" className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Failed</h1>
          <p className="text-gray-600 mb-6">
            Something went wrong with your payment. Please try again.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                // Remove redirect params and reload to show payment form
                const url = new URL(window.location.href)
                url.searchParams.delete('redirect_status')
                url.searchParams.delete('payment_intent')
                url.searchParams.delete('payment_intent_client_secret')
                window.location.href = url.toString()
              }}
              className="w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </Card>
      </div>
    )
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Preparing your checkout...</p>
        </div>
      </div>
    )
  }

  // Show disputed status
  if (paymentStatus === 'disputed') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 border border-gray-200 shadow-lg">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 mb-6">
            <Icon name="alert-circle" className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Payment Disputed</h1>
          <p className="text-gray-600 mb-6 text-sm">
            This payment created for Order{' '}
            <span className="font-mono font-semibold">{displayOrderId}</span> is currently under
            dispute. Please check your email or contact support for resolution.
          </p>
          <div className="space-y-3">
            <Link
              href="/support"
              className="block w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-center"
            >
              Contact Support
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Generic error state
  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 border border-gray-200 shadow-lg">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
            <Icon name="alert-circle" className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Something went wrong</h1>
          <p className="text-gray-600 mb-6 text-sm">{state.error}</p>
        </Card>
      </div>
    )
  }

  const service = state.service!

  // Handle payment method selection — persist to the order, then show checkout
  const handleConfirmPaymentMethod = async (method: PaymentMethodType) => {
    if (selectingMethod) return
    setSelectingMethod(true)
    try {
      const res = await fetch('/api/v1/select-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: state.paymentOrderId, paymentMethod: method }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to select payment method')
      }
      setConfirmedPaymentMethod(method)
    } catch (err) {
      console.error('Failed to select payment method:', err)
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to select payment method',
      }))
    } finally {
      setSelectingMethod(false)
    }
  }

  // If only one payment method is available, auto-select it
  const effectiveAllowed = state.allowedPaymentMethods.filter(
    (m) => m !== 'paypal' || Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
  )

  // Auto-confirm if only one method is available and not yet confirmed
  useEffect(() => {
    if (!confirmedPaymentMethod && effectiveAllowed.length === 1 && !selectingMethod) {
      handleConfirmPaymentMethod(effectiveAllowed[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedPaymentMethod, effectiveAllowed.length])

  // ─── Phase 1: Payment Method Selection ─────────────────────────────
  if (!confirmedPaymentMethod && effectiveAllowed.length > 1) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="text-center pt-8 pb-4 px-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <div className="text-3xl">🔐</div>
                <span className="text-2xl font-bold text-gray-900">DZTech</span>
              </div>
            </div>

            {/* Order Summary */}
            <div className="mx-6 mb-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Service</span>
                  <span className="font-semibold text-gray-900 text-sm">{service.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Order ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{displayOrderId}</span>
                    <button
                      onClick={copyOrderId}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Copy Order ID"
                    >
                      <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-500">
                    USD {service.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mx-6 mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Select Payment Method
              </h3>
              <div className="space-y-3">
                {effectiveAllowed.includes('cashapp') && (
                  <button
                    type="button"
                    disabled={selectingMethod}
                    onClick={() => handleConfirmPaymentMethod('cashapp')}
                    onMouseEnter={() => setHoveredPaymentMethod('cashapp')}
                    onMouseLeave={() => setHoveredPaymentMethod(null)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      hoveredPaymentMethod === 'cashapp'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-green-300'
                    } ${selectingMethod ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6 text-green-600"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <span className="text-base font-semibold text-gray-900">Cash App</span>
                      <p className="text-xs text-gray-500 mt-0.5">Pay instantly with Cash App</p>
                    </div>
                    <Icon name="chevron-right" className="ml-auto h-5 w-5 text-gray-400" />
                  </button>
                )}
                {effectiveAllowed.includes('paypal') && (
                  <button
                    type="button"
                    disabled={selectingMethod}
                    onClick={() => handleConfirmPaymentMethod('paypal')}
                    onMouseEnter={() => setHoveredPaymentMethod('paypal')}
                    onMouseLeave={() => setHoveredPaymentMethod(null)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      hoveredPaymentMethod === 'paypal'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${selectingMethod ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6 text-blue-600"
                        fill="currentColor"
                      >
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603c-.564 0-1.04.408-1.13.964L7.076 21.337z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <span className="text-base font-semibold text-gray-900">PayPal</span>
                      <p className="text-xs text-gray-500 mt-0.5">Pay with PayPal or Venmo</p>
                    </div>
                    <Icon name="chevron-right" className="ml-auto h-5 w-5 text-gray-400" />
                  </button>
                )}
              </div>
              {selectingMethod && (
                <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Setting up payment...</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 text-center">
              <p className="text-xs text-gray-400">
                Secured by <span className="font-medium text-blue-500">DZTech</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Phase 2: Checkout Form for the selected payment method ────────
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Payment Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="text-3xl">🔐</div>
              <span className="text-2xl font-bold text-gray-900">DZTech</span>
            </div>
          </div>

          {/* Payment Details Box */}
          <div className="mx-6 mb-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Payment Details
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Order ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{displayOrderId}</span>
                  <button
                    onClick={copyOrderId}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copy Order ID"
                  >
                    <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Payment Method</span>
                <span className="font-semibold text-gray-900 text-sm capitalize">
                  {confirmedPaymentMethod === 'cashapp' ? 'Cash App' : 'PayPal'}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-500">
                  USD {service.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="px-6 pb-8">
            {confirmedPaymentMethod === 'paypal' &&
            state.allowedPaymentMethods.includes('paypal') &&
            Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) ? (
              <PayPalPaymentForm
                serviceId={state.serviceId || ''}
                orderId={state.paymentOrderId || ''}
                amount={service.price}
                returnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
              />
            ) : confirmedPaymentMethod === 'cashapp' && state.clientSecret ? (
              <StripeProvider
                clientSecret={state.clientSecret}
                publishableKey={state.stripePublishableKey || undefined}
              >
                <CashAppPaymentForm
                  orderId={state.paymentOrderId || ''}
                  amount={service.price}
                  returnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
                />
              </StripeProvider>
            ) : stripeInitError ? (
              <div className="text-center py-8">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 mb-3">
                  <Icon name="alert-circle" className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-red-600 text-sm mb-3">{stripeInitError}</p>
                <button
                  onClick={initializeStripePayment}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-3">
                  <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-gray-500 text-sm">
                  {initializingStripe
                    ? 'Initializing Cash App payment...'
                    : 'Loading payment options...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
