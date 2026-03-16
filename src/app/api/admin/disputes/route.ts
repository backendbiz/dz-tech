import { getDb } from '@/lib/mongodb'
import { NextResponse } from 'next/server'

interface DisputedOrder {
  id: string
  orderId?: string | null
  customerEmail?: string | null
  total: number
  disputeStatus?: string | null
  disputeAmount?: number | null
  disputeReason?: string | null
  createdAt: string
}

export async function GET() {
  try {
    const db = await getDb()

    const docs = await db
      .collection('orders')
      .find({ status: 'disputed' })
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        orderId: 1,
        customerEmail: 1,
        total: 1,
        disputeStatus: 1,
        disputeAmount: 1,
        disputeReason: 1,
        createdAt: 1,
      })
      .toArray()

    const orders: DisputedOrder[] = docs.map((doc) => ({
      id: doc.orderId || doc._id.toString(),
      orderId: doc.orderId ?? null,
      customerEmail: doc.customerEmail ?? null,
      total: doc.total || 0,
      disputeStatus: doc.disputeStatus ?? null,
      disputeAmount: doc.disputeAmount ?? null,
      disputeReason: doc.disputeReason ?? null,
      createdAt: doc.createdAt,
    }))

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[Admin Disputes API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch disputed orders' }, { status: 500 })
  }
}
