import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

interface RevenueStats {
  totalRevenue: number
  paidOrdersCount: number
  averageOrderValue: number
  refundedAmount: number
  failedAmount: number
  pendingAmount: number
}

export async function GET() {
  try {
    const payload = await getPayloadClient()

    // Get all orders to calculate revenue
    const result = await payload.find({
      collection: 'orders',
      limit: 1000,
      overrideAccess: true,
    })

    const orders = result.docs

    const paidOrders = orders.filter((o) => o.status === 'paid')
    const refundedOrders = orders.filter((o) => o.status === 'refunded')
    const failedOrders = orders.filter((o) => o.status === 'failed')
    const pendingOrders = orders.filter((o) => o.status === 'pending')

    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const refundedAmount = refundedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const failedAmount = failedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const pendingAmount = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0

    const stats: RevenueStats = {
      totalRevenue,
      paidOrdersCount: paidOrders.length,
      averageOrderValue,
      refundedAmount,
      failedAmount,
      pendingAmount,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[Admin Revenue API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue stats' },
      { status: 500 }
    )
  }
}
