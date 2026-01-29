'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Icon, Button, Card } from '@/components/ui'
import Link from 'next/link'
import confetti from 'canvas-confetti'

interface OrderInfo {
  orderId: string
  serviceName?: string
  serviceId?: string
  price?: number
  createdAt?: string
  provider?: string | null
  successRedirectUrl?: string | null
}

/**
 * Replace {orderId} placeholder in URL with actual orderId
 */
function buildRedirectUrl(templateUrl: string, orderId: string): string {
  return templateUrl.replace(/{orderId}/g, orderId)
}

export function SuccessClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('orderId')
  const redirectStatus = searchParams.get('redirect_status')

  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [status, setStatus] = useState<'success' | 'failed' | 'processing' | 'loading'>('loading')

  // Trigger confetti on mount (only if success and not redirecting to provider)
  useEffect(() => {
    if (redirecting || status !== 'success') return

    // Trigger celebratory confetti
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)

    return () => clearInterval(interval)
  }, [redirecting, status])

  // Load order info from localStorage and check for provider redirect
  useEffect(() => {
    // If we have a specific redirect status from Stripe, use it to determine logic
    let currentStatus = 'success'
    if (redirectStatus) {
      if (redirectStatus === 'failed') {
        currentStatus = 'failed'
        setStatus('failed')
      } else if (redirectStatus === 'processing') {
        currentStatus = 'processing'
        setStatus('processing')
      } else if (redirectStatus === 'succeeded') {
        currentStatus = 'success'
        setStatus('success')
      }
    } else {
      setStatus('success')
    }

    if (orderId) {
      const orders = JSON.parse(localStorage.getItem('dztech_orders') || '[]')
      const order = orders.find((o: OrderInfo) => o.orderId === orderId)
      if (order) {
        // Only update status to paid if it was a success
        if (currentStatus === 'success') {
          order.status = 'paid'
          order.paidAt = new Date().toISOString()
          localStorage.setItem('dztech_orders', JSON.stringify(orders))
        }

        setOrderInfo(order)

        // Check if this is a provider payment with a redirect URL
        // Only redirect if payment succeeded
        if (order.successRedirectUrl && currentStatus === 'success') {
          setRedirecting(true)
        }
      } else {
        setOrderInfo({ orderId })
      }
    } else if (sessionId) {
      // Try to find order by session ID from recent orders
      const orders = JSON.parse(localStorage.getItem('dztech_orders') || '[]')
      if (orders.length > 0) {
        const latestOrder = orders[orders.length - 1]

        if (currentStatus === 'success') {
          latestOrder.status = 'paid'
          latestOrder.paidAt = new Date().toISOString()
          localStorage.setItem('dztech_orders', JSON.stringify(orders))
        }

        setOrderInfo(latestOrder)

        // Check if this is a provider payment with a redirect URL
        if (latestOrder.successRedirectUrl && currentStatus === 'success') {
          setRedirecting(true)
        }
      }
    }
  }, [orderId, sessionId, redirectStatus])

  // Handle provider redirect with countdown
  useEffect(() => {
    if (!redirecting || !orderInfo?.successRedirectUrl) return

    // Start countdown
    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          // Perform the redirect
          const redirectUrl = buildRedirectUrl(orderInfo.successRedirectUrl!, orderInfo.orderId)
          window.location.href = redirectUrl
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [redirecting, orderInfo])

  const handleRedirectNow = useCallback(() => {
    if (orderInfo?.successRedirectUrl) {
      const redirectUrl = buildRedirectUrl(orderInfo.successRedirectUrl, orderInfo.orderId)
      window.location.href = redirectUrl
    }
  }, [orderInfo])

  const copyOrderId = useCallback(() => {
    if (orderInfo?.orderId) {
      navigator.clipboard.writeText(orderInfo.orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [orderInfo])

  const displayOrderId = orderInfo?.orderId || orderId || sessionId || 'N/A'

  // Provider redirect UI
  if (redirecting && orderInfo?.provider) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card
          className="w-full max-w-md text-center border border-green-200 shadow-lg"
          padding="lg"
        >
          {/* Success Icon */}
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
            <Icon name="check-circle" className="h-12 w-12 text-green-600" strokeWidth={1.5} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful!</h1>

          {/* Order ID */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Order Reference</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono font-bold text-gray-900 text-sm truncate max-w-48">
                {orderInfo.orderId}
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
              Redirecting you back to <span className="font-semibold">{orderInfo.provider}</span>...
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span>Redirecting in {redirectCountdown} seconds</span>
            </div>
          </div>

          {/* Manual redirect button */}
          <button
            onClick={handleRedirectNow}
            className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
          >
            Continue to {orderInfo.provider} Now
          </button>

          {/* Footer */}
          <p className="mt-4 text-xs text-gray-400">
            Powered by <span className="font-medium text-blue-500">DZTech</span>
          </p>
        </Card>
      </div>
    )
  }

  const getHeaderContent = () => {
    switch (status) {
      case 'failed':
        return {
          colorClass: 'from-red-500 to-red-600',
          icon: 'alert-circle' as const,
          title: 'Payment Failed',
          message: 'Something went wrong with your payment.',
        }
      case 'processing':
        return {
          colorClass: 'from-blue-500 to-blue-600',
          icon: 'clock' as const,
          title: 'Payment Processing',
          message: 'Your payment is being processed. We will notify you once completed.',
        }
      default:
        return {
          colorClass: 'from-green-500 to-green-600',
          icon: 'check-circle' as const,
          title: 'Payment Successful!',
          message: 'Thank you for your purchase',
        }
    }
  }

  const headerContent = getHeaderContent()

  const tryAgainLink =
    status === 'failed' && orderInfo?.serviceId
      ? `/checkout?serviceId=${orderInfo.serviceId}${orderInfo.orderId ? `&orderId=${orderInfo.orderId}` : ''}`
      : '/services'

  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card
          className="text-center border border-gray-200 overflow-hidden shadow-xl"
          padding="none"
        >
          {/* Dynamic Header */}
          <div className={`bg-linear-to-br ${headerContent.colorClass} px-8 py-10`}>
            <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-white/20 mb-6 animate-bounce-slow">
              <Icon name={headerContent.icon} className="h-14 w-14 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {headerContent.title}
            </h1>
            <p className="text-opacity-90 text-white text-lg">{headerContent.message}</p>
          </div>

          {/* Order Details */}
          <div className="px-8 py-8">
            {/* Order ID */}
            <div className="mb-8 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">Your Order Reference</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono font-bold text-lg text-navy-900 truncate max-w-xs">
                  {displayOrderId}
                </span>
                <button
                  onClick={copyOrderId}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Icon name={copied ? 'check' : 'clipboard'} className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-600">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Order Summary */}
            {orderInfo && (orderInfo.serviceName || orderInfo.price) && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl text-left">
                <h3 className="font-semibold text-navy-900 mb-3">Order Summary</h3>
                {orderInfo.serviceName && (
                  <div className="flex justify-between py-2 border-b border-blue-100">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium text-navy-900">{orderInfo.serviceName}</span>
                  </div>
                )}
                {orderInfo.price && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Amount Paid</span>
                    <span className="font-bold text-blue-500">
                      ${orderInfo.price.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* What's Next - Only show on success */}
            {status === 'success' && (
              <div className="mb-8">
                <h3 className="font-semibold text-navy-900 mb-4 flex items-center justify-center gap-2">
                  <Icon name="info" className="h-5 w-5 text-blue-500" />
                  What Happens Next?
                </h3>
                <ol className="text-left space-y-3">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      1
                    </span>
                    <span className="text-gray-600">
                      You&apos;ll receive a confirmation email with your order details
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      2
                    </span>
                    <span className="text-gray-600">
                      Our team will review your order and reach out within 24 hours
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      3
                    </span>
                    <span className="text-gray-600">
                      We&apos;ll schedule a kick-off call to get started
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </Card>

        {/* Minimal Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>© 2026 DZTech. All rights reserved.</p>
        </div>
      </div>

      {/* Custom Animation Styles */}
      <style>{`
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
