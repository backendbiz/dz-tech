import { getDb } from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const db = await getDb()
    const ordersCollection = db.collection('orders')

    const pipeline = [
      // 1. Group by status — sum total and count per status in one pass
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]

    const results = await ordersCollection.aggregate(pipeline).toArray()

    // Map results into a lookup by status
    const byStatus = results.reduce<Record<string, { totalAmount: number; count: number }>>(
      (acc, row) => {
        acc[row._id] = { totalAmount: row.totalAmount, count: row.count }
        return acc
      },
      {},
    )

    const paid = byStatus['paid'] ?? { totalAmount: 0, count: 0 }
    const totalRevenue = paid.totalAmount
    const paidOrdersCount = paid.count
    const averageOrderValue = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0

    return NextResponse.json({
      totalRevenue,
      paidOrdersCount,
      averageOrderValue,
      refundedAmount: byStatus['refunded']?.totalAmount ?? 0,
      failedAmount: byStatus['failed']?.totalAmount ?? 0,
      pendingAmount: byStatus['pending']?.totalAmount ?? 0,
    })
  } catch (error) {
    console.error('[Admin Revenue API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue stats' }, { status: 500 })
  }
}
