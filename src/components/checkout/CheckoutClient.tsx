'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Icon, Card } from '@/components/ui'
import Image from 'next/image'
import Link from 'next/link'
import { StripeProvider } from '@/components/checkout/StripeProvider'
import { CashAppPaymentForm } from '@/components/checkout/CashAppPaymentForm'

interface ServiceData {
  id: string
  title: string
  description: string
  price: number
  slug: string
}

interface PaymentData {
  clientSecret: string
  orderId: string
  status?: 'paid' | 'failed' | 'disputed' | 'refunded' | 'pending'
  amount: number
  stripePublishableKey?: string
  provider?: string
  successRedirectUrl?: string
  cancelRedirectUrl?: string
}

type PaymentStatus = 'succeeded' | 'processing' | 'failed' | 'pending' | 'disputed' | null

interface CheckoutClientProps {
  siteName?: string
  logo?: {
    url?: string | null
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
}

function buildRedirectUrl(template: string, orderId: string) {
  return template.replace(/{orderId}/g, orderId)
}

export function CheckoutClient({ siteName = 'DZTech', logo }: CheckoutClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const serviceId = searchParams.get('serviceId')
  const status = searchParams.get('status')

  // Stripe redirect params (added after Cash App payment)
  const redirectStatus = searchParams.get('redirect_status') as PaymentStatus
  const paymentIntentParam = searchParams.get('payment_intent')
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')

  const [service, setService] = useState<ServiceData | null>(null)
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [copied, setCopied] = useState(false)

  const displayOrderId = payment?.orderId ?? orderId

  useEffect(() => {
    if (!serviceId) {
      setLoading(false)
      setError('No service selected. Please go back and select a service.')
      return
    }

    const init = async () => {
      try {
        const [serviceRes, paymentRes] = await Promise.all([
          fetch(`/api/services/${serviceId}`),
          fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceId, orderId }),
          }),
        ])

        if (!serviceRes.ok) throw new Error('Service not found')
        const serviceData: ServiceData = await serviceRes.json()

        if (!paymentRes.ok) {
          const err = await paymentRes.json()
          const e = new Error(err.error || 'Failed to initialize payment') as Error & {
            code?: string
          }
          e.code = err.errorCode
          throw e
        }
        const paymentData: PaymentData = await paymentRes.json()

        // Map payment status
        const statusMap: Record<string, PaymentStatus> = {
          paid: 'succeeded',
          failed: 'failed',
          disputed: 'disputed',
          refunded: 'disputed',
        }
        if (paymentData.status) setPaymentStatus(statusMap[paymentData.status] ?? null)

        if (paymentData.amount) serviceData.price = paymentData.amount

        setService(serviceData)
        setPayment(paymentData)
      } catch (e) {
        const err = e as Error & { code?: string }
        setError(err.message)
        setErrorCode(err.code ?? null)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [serviceId, orderId])

  // Store order ID and provider info in localStorage
  useEffect(() => {
    if (!payment || !service) return
    const orders = JSON.parse(localStorage.getItem('dztech_orders') || '[]')
    if (!orders.find((o: { orderId: string }) => o.orderId === payment.orderId)) {
      orders.push({
        orderId: payment.orderId,
        serviceId,
        serviceName: service.title,
        price: service.price,
        createdAt: new Date().toISOString(),
        status: 'pending',
        provider: payment.provider,
        successRedirectUrl: payment.successRedirectUrl,
      })
      localStorage.setItem('dztech_orders', JSON.stringify(orders))
    }
  }, [payment, service, serviceId])

  // Verify payment status from Stripe redirect
  useEffect(() => {
    if (!paymentIntentParam || !paymentIntentClientSecret || !payment?.stripePublishableKey) {
      // Fallback to redirect_status if no Stripe verification possible
      if (redirectStatus) {
        setPaymentStatus(
          redirectStatus === 'succeeded'
            ? 'succeeded'
            : redirectStatus === 'failed'
              ? 'failed'
              : 'pending',
        )
      }
      return
    }

    const verify = async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(payment.stripePublishableKey!)
        if (!stripe) throw new Error('Failed to load Stripe')

        const { paymentIntent, error } =
          await stripe.retrievePaymentIntent(paymentIntentClientSecret)
        if (error) throw error

        const statusMap: Record<string, PaymentStatus> = {
          succeeded: 'succeeded',
          processing: 'processing',
          requires_payment_method: 'failed',
          requires_confirmation: 'failed',
          requires_action: 'failed',
          canceled: 'failed',
        }
        setPaymentStatus(statusMap[paymentIntent!.status] ?? 'pending')
      } catch {
        setPaymentStatus(redirectStatus === 'succeeded' ? 'succeeded' : 'failed')
      }
    }

    verify()
  }, [paymentIntentParam, paymentIntentClientSecret, redirectStatus, payment?.stripePublishableKey])

  // Handle success - update localStorage and check for redirect
  useEffect(() => {
    if (paymentStatus !== 'succeeded' || !orderId) return

    const orders = JSON.parse(localStorage.getItem('dztech_orders') || '[]')
    const order = orders.find((o: { orderId: string }) => o.orderId === orderId)
    if (order) {
      order.status = 'paid'
      order.paidAt = new Date().toISOString()
      localStorage.setItem('dztech_orders', JSON.stringify(orders))
      if (order.successRedirectUrl) setRedirecting(true)
    }
  }, [paymentStatus, orderId])

  // Countdown and redirect
  useEffect(() => {
    if (!redirecting || !payment?.successRedirectUrl || !orderId) return

    const interval = setInterval(() => {
      setRedirectCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          window.location.href = buildRedirectUrl(payment.successRedirectUrl!, orderId)
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [redirecting, payment?.successRedirectUrl, orderId])

  const handleRedirectNow = useCallback(() => {
    if (payment?.successRedirectUrl && orderId) {
      window.location.href = buildRedirectUrl(payment.successRedirectUrl, orderId)
    }
  }, [payment?.successRedirectUrl, orderId])

  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = useCallback(() => {
    setIsCancelling(true)

    // If there's a cancelRedirectUrl from provider (e.g., Bitloader), use it
    if (payment?.cancelRedirectUrl) {
      window.location.href = payment.cancelRedirectUrl
      return
    }
    // Otherwise go back to service page
    if (service?.slug) {
      router.push(`/services/${service.slug}`)
    } else {
      router.push('/services')
    }
  }, [router, service?.slug, payment?.cancelRedirectUrl])

  const copyOrderId = useCallback(() => {
    if (!displayOrderId) return
    navigator.clipboard.writeText(displayOrderId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [displayOrderId])

  // Show cancelled status
  if (status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card
          className="w-full max-w-md text-center p-8 border border-gray-200 shadow-lg"
          padding="lg"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 mb-6">
            <Icon name="alert-circle" className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6 text-sm">
            Your payment was cancelled. No charges were made.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/services"
              className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Browse Services
            </Link>
          </div>
        </Card>
      </div>
    )
  }

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
  if (paymentStatus === 'succeeded' && redirecting && payment?.provider) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card
          className="w-full max-w-md text-center border border-green-200 shadow-lg"
          padding="lg"
        >
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
              Redirecting you back to <span className="font-semibold">{payment?.provider}</span>...
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
            Continue to {payment?.provider} Now
          </button>

          <p className="mt-4 text-xs text-gray-400">
            Powered by <span className="font-medium text-blue-500">{siteName}</span>
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
          <Card
            className="text-center border border-green-200 overflow-hidden shadow-xl"
            padding="none"
          >
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
            <p>© 2026 {siteName}. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  // Show payment processing
  if (paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border border-blue-200 shadow-lg" padding="lg">
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
              >
                <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          <Link
            href="/services"
            className="block w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-center"
          >
            Browse Services
          </Link>
        </Card>
      </div>
    )
  }

  // Show payment failed
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border border-red-200 shadow-lg" padding="lg">
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
            <Link
              href="/services"
              className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Browse Services
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Loading state
  if (loading) {
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
        <Card
          className="w-full max-w-md text-center p-8 border border-gray-200 shadow-lg"
          padding="lg"
        >
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
            <Link
              href="/services"
              className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Browse Services
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Error state - Cash App Unavailable (special UI)
  if (errorCode === 'CASHAPP_UNAVAILABLE') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card
          className="w-full max-w-md text-center p-8 border border-gray-200 shadow-lg"
          padding="lg"
        >
          {/* Cash App Logo/Icon */}
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-green-600" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-3">Cash App Not Available</h1>

          <p className="text-gray-600 mb-4 text-sm">
            We only accept <span className="font-semibold text-green-600">Cash App</span> payments
            for our services.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Icon name="alert-circle" className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-amber-800 text-sm font-medium">Configuration Required</p>
                <p className="text-amber-700 text-xs mt-1">
                  Cash App payments require a US-based Stripe account. Please contact our team to
                  resolve this issue.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Generic error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card
          className="w-full max-w-md text-center p-8 border border-gray-200 shadow-lg"
          padding="lg"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
            <Icon name="alert-circle" className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Something went wrong</h1>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <Link
            href="/services"
            className="block w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-center"
          >
            Browse Services
          </Link>
        </Card>
      </div>
    )
  }

  if (!service || !payment) return null

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Payment Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              {logo?.url ? (
                <div className="relative h-12 w-auto min-w-[120px]">
                  <Image
                    src={logo.url}
                    alt={logo.alt || siteName}
                    width={logo.width || 120}
                    height={logo.height || 48}
                    className="h-12 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="inline-flex items-center gap-2">
                  <div className="text-3xl">🔐</div>
                  <span className="text-2xl font-bold text-gray-900">{siteName}</span>
                </div>
              )}
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
            {payment?.clientSecret ? (
              <StripeProvider
                clientSecret={payment.clientSecret}
                publishableKey={payment.stripePublishableKey}
              >
                <CashAppPaymentForm
                  orderId={payment.orderId}
                  amount={service.price}
                  onCancel={handleCancel}
                  isCancelling={isCancelling}
                />
              </StripeProvider>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-3">
                  <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-gray-500 text-sm">Loading payment options...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
