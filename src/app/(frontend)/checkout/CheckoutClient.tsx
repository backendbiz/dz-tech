'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Icon, Card } from '@/components/ui'
import type { IconName } from '@/components/ui'
import Link from 'next/link'
import { StripeProvider } from '@/components/checkout/StripeProvider'
import { CashAppPaymentForm } from '@/components/checkout/CashAppPaymentForm'

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
}

export function CheckoutClient() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const serviceId = searchParams.get('serviceId')
  const status = searchParams.get('status')

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
  })

  const [copied, setCopied] = useState(false)

  // Fetch service details and create payment intent
  // Note: Duplicate calls are safely handled by Stripe's idempotency key on the backend
  useEffect(() => {
    async function initializeCheckout() {
      if (!serviceId) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No service selected. Please go back and select a service.',
        }))
        return
      }

      try {
        // First, fetch service details
        const serviceResponse = await fetch(`/api/services/${serviceId}`)
        if (!serviceResponse.ok) {
          throw new Error('Service not found')
        }
        const service = await serviceResponse.json()

        // Then, create a payment intent
        const paymentResponse = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceId,
            orderId,
          }),
        })

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json()
          // Create custom error with errorCode attached
          const error = new Error(errorData.error || 'Failed to initialize payment') as Error & {
            code?: string
          }
          error.code = errorData.errorCode
          throw error
        }

        const paymentData = await paymentResponse.json()

        // Use the actual amount from the payment intent (handles custom amounts)
        if (paymentData.amount) {
          service.price = paymentData.amount
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          service,
          clientSecret: paymentData.clientSecret,
          paymentOrderId: paymentData.orderId,
          stripePublishableKey: paymentData.stripePublishableKey,
          provider: paymentData.provider || null,
          successRedirectUrl: paymentData.successRedirectUrl || null,
          cancelRedirectUrl: paymentData.cancelRedirectUrl || null,
        }))
      } catch (error) {
        console.error('Checkout initialization error:', error)
        const errorWithCode = error as Error & { code?: string }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize checkout',
          errorCode: errorWithCode.code || null,
        }))
      }
    }

    initializeCheckout()
  }, [serviceId, orderId])

  // Store order ID and provider info in localStorage
  useEffect(() => {
    if (state.paymentOrderId && state.service) {
      const orders = JSON.parse(localStorage.getItem('dztech_orders') || '[]')
      const existingOrder = orders.find(
        (o: { orderId: string }) => o.orderId === state.paymentOrderId,
      )
      if (!existingOrder) {
        orders.push({
          orderId: state.paymentOrderId,
          serviceId,
          serviceName: state.service.title,
          price: state.service.price,
          createdAt: new Date().toISOString(),
          status: 'pending',
          // Store provider info for redirect on success page
          provider: state.provider,
          successRedirectUrl: state.successRedirectUrl,
          cancelRedirectUrl: state.cancelRedirectUrl,
        })
        localStorage.setItem('dztech_orders', JSON.stringify(orders))
      }
    }
  }, [
    state.paymentOrderId,
    serviceId,
    state.service,
    state.provider,
    state.successRedirectUrl,
    state.cancelRedirectUrl,
  ])

  const copyOrderId = useCallback(() => {
    const orderIdToCopy = state.paymentOrderId || orderId
    if (orderIdToCopy) {
      navigator.clipboard.writeText(orderIdToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [state.paymentOrderId, orderId])

  const displayOrderId = state.paymentOrderId || orderId

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

  // Error state - Cash App Unavailable (special UI)
  if (state.errorCode === 'CASHAPP_UNAVAILABLE') {
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

          <div className="space-y-3">
            <Link
              href="/contact"
              className="block w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-center"
            >
              Contact Support
            </Link>
            <Link
              href="/services"
              className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Browse Other Services
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
        <Card
          className="w-full max-w-md text-center p-8 border border-gray-200 shadow-lg"
          padding="lg"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
            <Icon name="alert-circle" className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Something went wrong</h1>
          <p className="text-gray-600 mb-6 text-sm">{state.error}</p>
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

  const service = state.service!

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
            {state.clientSecret ? (
              <StripeProvider
                clientSecret={state.clientSecret}
                publishableKey={state.stripePublishableKey || undefined}
              >
                <CashAppPaymentForm
                  orderId={state.paymentOrderId || displayOrderId || ''}
                  amount={service.price}
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



        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href={`/services/${service.slug}`}
            className="text-gray-500 hover:text-gray-700 text-sm inline-flex items-center gap-1"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Back to Service Details
          </Link>
        </div>
      </div>
    </div>
  )
}
