import { getDb } from '@/lib/mongodb'
import { NextResponse } from 'next/server'

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

    const db = await getDb()

    // Build $match stage
    const match: Record<string, unknown> = {}

    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.$gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        dateFilter.$lte = toDate
      }
      match.createdAt = dateFilter
    }

    // Threshold for recentOrdersCount — last 30 days, or the date range itself if provided
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentThreshold = from ? new Date(from) : thirtyDaysAgo

    const pipeline = [
      // 1. Apply date filter
      { $match: match },

      // 2. Group all matched orders — compute every stat in one pass
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          failedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
          },
          recentOrdersCount: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', recentThreshold] }, 1, 0],
            },
          },
        },
      },

      // 3. Clean up the _id: null
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          pendingOrders: 1,
          failedOrders: 1,
          paidOrders: 1,
          recentOrdersCount: 1,
        },
      },
    ]

    const results = await db.collection('orders').aggregate(pipeline).toArray()

    // If no orders match, aggregate returns empty array — fallback to zeros
    const stats: OrderStats =
      results.length > 0
        ? {
            totalOrders: results[0].totalOrders ?? 0,
            pendingOrders: results[0].pendingOrders ?? 0,
            failedOrders: results[0].failedOrders ?? 0,
            recentOrdersCount: results[0].recentOrdersCount ?? 0,
            paidOrders: results[0].paidOrders ?? 0,
          }
        : {
            totalOrders: 0,
            pendingOrders: 0,
            failedOrders: 0,
            recentOrdersCount: 0,
            paidOrders: 0,
          }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return NextResponse.json({ error: 'Failed to fetch order stats' }, { status: 500 })
  }
}
