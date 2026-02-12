'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Icon, Card } from '@/components/ui'
import type { IconName } from '@/components/ui'
import Link from 'next/link'
import { StripeProvider } from '@/components/checkout/StripeProvider'
import { CashAppPaymentForm } from '@/components/checkout/CashAppPaymentForm'

// ============================================================================
// Types
// ============================================================================

interface ServiceData {
  id: string
  title: string
  description: string
  price: number
  priceUnit?: string
  icon?: IconName
  slug: string
}

interface CheckoutSessionData {
  clientSecret: string
  orderId: string
  status?: 'paid' | 'failed' | 'disputed' | 'refunded' | 'pending'
  stripePublishableKey?: string
  service: ServiceData
  provider?: string
  successRedirectUrl?: string
  cancelRedirectUrl?: string
}

type PaymentStatus = 'succeeded' | 'processing' | 'failed' | 'pending' | 'disputed' | null

// ============================================================================
// Utility Components
// ============================================================================

function LoadingSpinner({ message, size = 'md' }: { message: string; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'h-10 w-10' : 'h-16 w-16'
  const spinnerSize = size === 'sm' ? 'h-5 w-5 border-2' : 'h-8 w-8 border-4'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div
          className={`inline-flex ${sizeClasses} items-center justify-center rounded-full bg-blue-100 mb-4`}
        >
          <div
            className={`${spinnerSize} border-blue-500 border-t-transparent rounded-full animate-spin`}
          />
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
}

function OrderReference({
  orderId,
  copied,
  onCopy,
  variant = 'default',
}: {
  orderId: string
  copied: boolean
  onCopy: () => void
  variant?: 'default' | 'large'
}) {
  if (variant === 'large') {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-500 mb-2">Your Order Reference</p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono font-bold text-lg text-gray-900 truncate max-w-xs">
            {orderId}
          </span>
          <button
            onClick={onCopy}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 p-3 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500 mb-1">Order Reference</p>
      <div className="flex items-center justify-center gap-2">
        <span className="font-mono font-bold text-gray-900 text-sm truncate max-w-48">
          {orderId}
        </span>
        <button
          onClick={onCopy}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Copy Order ID"
        >
          <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}

interface StatusPageProps {
  variant: 'success' | 'processing' | 'failed' | 'disputed' | 'error'
  title: string
  message: string
  orderId?: string
  copied?: boolean
  onCopy?: () => void
  children?: React.ReactNode
}

function StatusPage({
  variant,
  title,
  message,
  orderId,
  copied,
  onCopy,
  children,
}: StatusPageProps) {
  const config = {
    success: {
      bg: 'bg-linear-to-br from-green-50 to-green-100',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      icon: 'check-circle' as IconName,
    },
    processing: {
      bg: 'bg-linear-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      icon: 'clock' as IconName,
    },
    failed: {
      bg: 'bg-linear-to-br from-red-50 to-red-100',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      icon: 'alert-circle' as IconName,
    },
    disputed: {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      icon: 'alert-circle' as IconName,
    },
    error: {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      icon: 'alert-circle' as IconName,
    },
  }[variant]

  return (
    <div className={`min-h-screen ${config.bg} flex items-center justify-center p-4`}>
      <Card
        className={`w-full max-w-md text-center border ${config.border} shadow-lg`}
        padding="lg"
      >
        <div
          className={`inline-flex h-20 w-20 items-center justify-center rounded-full ${config.iconBg} mb-6`}
        >
          <Icon name={config.icon} className={`h-12 w-12 ${config.iconColor}`} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>

        {orderId && onCopy && <OrderReference orderId={orderId} copied={copied!} onCopy={onCopy} />}

        {children}
      </Card>
    </div>
  )
}

// ============================================================================
// Custom Hooks
// ============================================================================

function useCopyToClipboard(text: string | null) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    if (text) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  return { copied, copy }
}

function useCheckoutSession(token: string) {
  const [data, setData] = useState<CheckoutSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<PaymentStatus>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Invalid checkout link.')
      return
    }

    fetch(`/api/checkout-session/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to load checkout session')
        }
        return res.json()
      })
      .then((sessionData: CheckoutSessionData) => {
        setData(sessionData)

        // Map existing order status to payment status
        const statusMap: Record<string, PaymentStatus> = {
          paid: 'succeeded',
          failed: 'failed',
          disputed: 'disputed',
          refunded: 'disputed',
        }
        if (sessionData.status && statusMap[sessionData.status]) {
          setInitialStatus(statusMap[sessionData.status])
        }
      })
      .catch((err) => {
        console.error('Checkout initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize checkout')
      })
      .finally(() => setLoading(false))
  }, [token])

  return { data, loading, error, initialStatus }
}

function usePaymentVerification(
  publishableKey: string | null,
  paymentIntentClientSecret: string | null,
  redirectStatus: string | null,
) {
  const [status, setStatus] = useState<PaymentStatus>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!paymentIntentClientSecret) return

    setVerifying(true)

    const verify = async () => {
      try {
        const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        if (!key) {
          setStatus(redirectStatus === 'succeeded' ? 'succeeded' : 'failed')
          return
        }

        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(key)
        if (!stripe) {
          setStatus(redirectStatus === 'succeeded' ? 'succeeded' : 'failed')
          return
        }

        const { paymentIntent, error } =
          await stripe.retrievePaymentIntent(paymentIntentClientSecret)

        if (error) {
          setStatus('failed')
          return
        }

        const statusMap: Record<string, PaymentStatus> = {
          succeeded: 'succeeded',
          processing: 'processing',
          requires_payment_method: 'failed',
          requires_confirmation: 'failed',
          requires_action: 'failed',
          canceled: 'failed',
        }

        setStatus(statusMap[paymentIntent?.status || ''] || 'pending')
      } catch {
        setStatus(redirectStatus === 'succeeded' ? 'succeeded' : 'failed')
      } finally {
        setVerifying(false)
      }
    }

    verify()
  }, [paymentIntentClientSecret, publishableKey, redirectStatus])

  return { status, verifying }
}

function useRedirectCountdown(
  shouldRedirect: boolean,
  redirectUrl: string | null,
  orderId: string | null,
) {
  const [countdown, setCountdown] = useState(5)

  const buildUrl = useCallback(
    () => (redirectUrl && orderId ? redirectUrl.replace(/{orderId}/g, orderId) : null),
    [redirectUrl, orderId],
  )

  const redirectNow = useCallback(() => {
    const url = buildUrl()
    if (url) window.location.href = url
  }, [buildUrl])

  useEffect(() => {
    if (!shouldRedirect || !redirectUrl || !orderId) return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          redirectNow()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [shouldRedirect, redirectUrl, orderId, redirectNow])

  return { countdown, redirectNow }
}

// ============================================================================
// Main Component
// ============================================================================

export function CheckoutTokenClient({ token }: { token: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectStatus = searchParams.get('redirect_status')
  const paymentIntentParam = searchParams.get('payment_intent')
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')

  const { data, loading, error, initialStatus } = useCheckoutSession(token)
  const { copied, copy: copyOrderId } = useCopyToClipboard(data?.orderId || null)

  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = useCallback(() => {
    setIsCancelling(true)

    if (data?.service?.slug) {
      router.push(`/services/${data.service.slug}`)
    } else if (data?.cancelRedirectUrl) {
      window.location.href = data.cancelRedirectUrl
    } else {
      router.push('/services')
    }
  }, [router, data?.service?.slug, data?.cancelRedirectUrl])

  const { status: verifiedStatus, verifying } = usePaymentVerification(
    data?.stripePublishableKey || null,
    paymentIntentClientSecret,
    redirectStatus,
  )

  // Use verified status from redirect, or initial status from order
  const paymentStatus = verifiedStatus || initialStatus

  const shouldRedirect =
    paymentStatus === 'succeeded' && !!data?.successRedirectUrl && !!data?.provider
  const { countdown, redirectNow } = useRedirectCountdown(
    shouldRedirect,
    data?.successRedirectUrl || null,
    data?.orderId || null,
  )

  // Verifying payment
  if (paymentIntentParam && verifying) {
    return <LoadingSpinner message="Verifying payment status..." />
  }

  // Loading checkout session
  if (loading) {
    return <LoadingSpinner message="Preparing your checkout..." />
  }

  // Error state
  if (error) {
    return (
      <StatusPage variant="error" title="Something went wrong" message={error}>
        <Link
          href="/services"
          className="block w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-center"
        >
          Browse Services
        </Link>
      </StatusPage>
    )
  }

  // Success with provider redirect
  if (paymentStatus === 'succeeded' && shouldRedirect && data?.provider) {
    return (
      <StatusPage
        variant="success"
        title="Payment Successful!"
        message=""
        orderId={data.orderId}
        copied={copied}
        onCopy={copyOrderId}
      >
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            Redirecting you back to <span className="font-semibold">{data.provider}</span>...
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <div className="h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span>Redirecting in {countdown} seconds</span>
          </div>
        </div>
        <button
          onClick={redirectNow}
          className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
        >
          Continue to {data.provider} Now
        </button>
        <p className="mt-4 text-xs text-gray-400">
          Powered by <span className="font-medium text-blue-500">DZTech</span>
        </p>
      </StatusPage>
    )
  }

  // Success (no redirect)
  if (paymentStatus === 'succeeded' && data) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card
            className="text-center border border-green-200 overflow-hidden shadow-xl"
            padding="none"
          >
            <div className="bg-linear-to-br from-green-500 to-green-600 px-8 py-10">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-6">
                <Icon name="check-circle" className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Payment Successful!</h1>
              <p className="text-white/90 text-lg">Thank you for your purchase</p>
            </div>
            <div className="px-8 py-8">
              <OrderReference
                orderId={data.orderId}
                copied={copied}
                onCopy={copyOrderId}
                variant="large"
              />
            </div>
          </Card>
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>© 2026 DZTech. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  // Processing
  if (paymentStatus === 'processing' && data) {
    return (
      <StatusPage
        variant="processing"
        title="Payment Processing"
        message="Your payment is being processed. We'll notify you once it's complete."
        orderId={data.orderId}
        copied={copied}
        onCopy={copyOrderId}
      >
        <Link
          href="/services"
          className="block w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-center"
        >
          Browse Services
        </Link>
      </StatusPage>
    )
  }

  // Failed
  if (paymentStatus === 'failed') {
    const handleRetry = () => {
      const url = new URL(window.location.href)
      url.searchParams.delete('redirect_status')
      url.searchParams.delete('payment_intent')
      url.searchParams.delete('payment_intent_client_secret')
      window.location.href = url.toString()
    }

    return (
      <StatusPage
        variant="failed"
        title="Payment Failed"
        message="Something went wrong with your payment. Please try again."
      >
        <div className="space-y-3">
          <button
            onClick={handleRetry}
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
      </StatusPage>
    )
  }

  // Disputed
  if (paymentStatus === 'disputed' && data) {
    return (
      <StatusPage
        variant="disputed"
        title="Payment Disputed"
        message={`This payment for Order ${data.orderId} is under dispute. Please check your email or contact support.`}
      >
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
      </StatusPage>
    )
  }

  // Main checkout form
  if (!data?.service) {
    return <LoadingSpinner message="Loading..." />
  }

  const { service, clientSecret, orderId, stripePublishableKey } = data

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

          {/* Payment Details */}
          <div className="mx-6 mb-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Payment Details
            </h3>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Order ID</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{orderId}</span>
                <button
                  onClick={copyOrderId}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy Order ID"
                >
                  <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-gray-500" />
                </button>
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

          {/* Payment Form */}
          <div className="px-6 pb-8">
            {clientSecret ? (
              <StripeProvider
                clientSecret={clientSecret}
                publishableKey={stripePublishableKey || undefined}
              >
                <CashAppPaymentForm
                  orderId={orderId}
                  amount={service.price}
                  returnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
                  onCancel={handleCancel}
                  isCancelling={isCancelling}
                />
              </StripeProvider>
            ) : (
              <LoadingSpinner message="Loading payment options..." size="sm" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
