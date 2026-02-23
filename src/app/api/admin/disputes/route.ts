import { getPayloadClient } from '@/lib/payload'
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
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'orders',
      where: {
        status: { equals: 'disputed' },
      },
      sort: '-createdAt',
      limit: 50,
      overrideAccess: true,
    })

    const orders: DisputedOrder[] = result.docs.map((doc) => ({
      id: doc.id,
      orderId: doc.orderId,
      customerEmail: doc.customerEmail,
      total: doc.total || 0,
      disputeStatus: doc.disputeStatus,
      disputeAmount: doc.disputeAmount,
      disputeReason: doc.disputeReason,
      createdAt: doc.createdAt,
    }))

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[Admin Disputes API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disputed orders' },
      { status: 500 }
    )
  }
}
