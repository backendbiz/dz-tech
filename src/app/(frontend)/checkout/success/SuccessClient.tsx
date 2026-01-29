'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Icon, Button, Card } from '@/components/ui'
import Link from 'next/link'
import confetti from 'canvas-confetti'

interface OrderInfo {
  orderId: string
  serviceName?: string
  price?: number
  createdAt?: string
}

export function SuccessClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('orderId')

  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [copied, setCopied] = useState(false)

  // Trigger confetti on mount
  useEffect(() => {
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
  }, [])

  // Load order info from localStorage
  useEffect(() => {
    if (orderId) {
      const orders = JSON.parse(localStorage.getItem('dztech_orders') || '[]')
      const order = orders.find((o: OrderInfo) => o.orderId === orderId)
      if (order) {
        // Update order status to paid
        order.status = 'paid'
        order.paidAt = new Date().toISOString()
        localStorage.setItem('dztech_orders', JSON.stringify(orders))
        setOrderInfo(order)
      } else {
        setOrderInfo({ orderId })
      }
    } else if (sessionId) {
      // Try to find order by session ID from recent orders
      const orders = JSON.parse(localStorage.getItem('dztech_orders') || '[]')
      if (orders.length > 0) {
        const latestOrder = orders[orders.length - 1]
        latestOrder.status = 'paid'
        latestOrder.paidAt = new Date().toISOString()
        localStorage.setItem('dztech_orders', JSON.stringify(orders))
        setOrderInfo(latestOrder)
      }
    }
  }, [orderId, sessionId])

  const copyOrderId = useCallback(() => {
    if (orderInfo?.orderId) {
      navigator.clipboard.writeText(orderInfo.orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [orderInfo])

  const displayOrderId = orderInfo?.orderId || orderId || sessionId || 'N/A'

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="container">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-linear-to-br from-blue-500 to-navy-900 flex items-center justify-center">
                <span className="text-white font-bold text-lg">DZ</span>
              </div>
              <span className="font-heading font-bold text-xl text-navy-900">DZTech</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 md:py-20">
        <div className="container max-w-2xl">
          <Card className="text-center border border-gray-200 overflow-hidden" padding="none">
            {/* Success Header */}
            <div className="bg-linear-to-br from-green-500 to-green-600 px-8 py-10">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-white/20 mb-6 animate-bounce-slow">
                <Icon name="check-circle" className="h-14 w-14 text-white" strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Payment Successful!
              </h1>
              <p className="text-green-100 text-lg">Thank you for your purchase</p>
            </div>

            {/* Order Details */}
            <div className="px-8 py-8">
              {/* Order ID */}
              <div className="mb-8 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">Your Order Reference</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono font-bold text-xl text-navy-900">
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

              {/* What's Next */}
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

              {/* Important Note */}
              <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-left">
                <div className="flex gap-3">
                  <Icon name="alert-circle" className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 mb-1">Save Your Order ID</p>
                    <p className="text-sm text-yellow-700">
                      Please save your order reference number. You&apos;ll need it for any inquiries
                      about your order.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="primary" href="/services">
                  Browse More Services
                </Button>
                <Button variant="outline" href="/contact">
                  Contact Support
                </Button>
              </div>
            </div>
          </Card>

          {/* Need Help */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Questions about your order?{' '}
              <Link href="/contact" className="text-blue-500 hover:text-blue-600 font-medium">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© 2026 DZTech. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-gray-700">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-700">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Animation Styles */}
      <style jsx>{`
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
    </div>
  )
}
