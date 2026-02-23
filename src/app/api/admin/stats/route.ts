import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import type { Where } from 'payload'

export interface OrderStats {
  totalOrders: number
  pendingOrders: number
  failedOrders: number
  recentOrdersCount: number
  paidOrders: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    console.log('[Admin Stats API] Starting request...', { from, to })
    const payload = await getPayloadClient()
    console.log('[Admin Stats API] Payload client initialized')

    // Build date filter if provided
    let dateFilter: Where | undefined
    if (from || to) {
      const createdAtFilter: Record<string, string> = {}
      if (from) {
        createdAtFilter.greater_than_equal = new Date(from).toISOString()
      }
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        createdAtFilter.less_than_equal = toDate.toISOString()
      }
      dateFilter = { createdAt: createdAtFilter }
    }

    // Get total orders count (filtered by date if provided)
    console.log('[Admin Stats API] Fetching total orders count...')
    const totalOrdersResult = await payload.count({
      collection: 'orders',
      where: dateFilter,
      overrideAccess: true,
    })
    console.log('[Admin Stats API] Total orders:', totalOrdersResult.totalDocs)

    // Get pending orders count
    const pendingOrdersResult = await payload.count({
      collection: 'orders',
      where: dateFilter
        ? { and: [dateFilter, { status: { equals: 'pending' } }] }
        : { status: { equals: 'pending' } },
      overrideAccess: true,
    })

    // Get failed orders count
    const failedOrdersResult = await payload.count({
      collection: 'orders',
      where: dateFilter
        ? { and: [dateFilter, { status: { equals: 'failed' } }] }
        : { status: { equals: 'failed' } },
      overrideAccess: true,
    })

    // Get paid/successful orders count
    const paidOrdersResult = await payload.count({
      collection: 'orders',
      where: dateFilter
        ? { and: [dateFilter, { status: { equals: 'paid' } }] }
        : { status: { equals: 'paid' } },
      overrideAccess: true,
    })

    // Get orders from the last 30 days for recent orders (or within date range)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentOrdersResult = await payload.count({
      collection: 'orders',
      where: dateFilter || { createdAt: { greater_than: thirtyDaysAgo.toISOString() } },
      overrideAccess: true,
    })

    const stats: OrderStats = {
      totalOrders: totalOrdersResult.totalDocs || 0,
      pendingOrders: pendingOrdersResult.totalDocs || 0,
      failedOrders: failedOrdersResult.totalDocs || 0,
      recentOrdersCount: recentOrdersResult.totalDocs || 0,
      paidOrders: paidOrdersResult.totalDocs || 0,
    }

    console.log('[Admin Stats API] Returning stats:', stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return NextResponse.json({ error: 'Failed to fetch order stats' }, { status: 500 })
  }
}
