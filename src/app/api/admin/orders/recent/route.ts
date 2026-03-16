import { getDb } from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export interface RecentOrderResponse {
  id: string
  orderId?: string | null
  customer: string
  email: string
  product: string
  amount: string
  status:
    | 'Completed'
    | 'Pending'
    | 'Processing'
    | 'Cancelled'
    | 'Paid'
    | 'Failed'
    | 'Refunded'
    | 'Disputed'
  date: string
}

function mapOrderStatus(status: string): RecentOrderResponse['status'] {
  switch (status) {
    case 'paid':
      return 'Completed'
    case 'pending':
      return 'Pending'
    case 'failed':
      return 'Failed'
    case 'refunded':
      return 'Cancelled'
    case 'disputed':
      return 'Processing'
    default:
      return 'Pending'
  }
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

    const pipeline = [
      // 1. Filter by date if provided
      { $match: match },

      // 2. Sort newest first
      { $sort: { createdAt: -1 } },

      // 3. Limit to 10
      { $limit: 10 },

      // 4. Lookup service title
      {
        $lookup: {
          from: 'services',
          localField: 'service',
          foreignField: '_id',
          as: 'serviceData',
        },
      },

      // 5. Lookup provider name + slug
      {
        $lookup: {
          from: 'providers',
          localField: 'provider',
          foreignField: '_id',
          as: 'providerData',
        },
      },

      // 6. Project only what we need
      {
        $project: {
          _id: 1,
          orderId: 1,
          customerEmail: 1,
          total: 1,
          status: 1,
          createdAt: 1,
          providerName: { $arrayElemAt: ['$providerData.name', 0] },
          providerSlug: { $arrayElemAt: ['$providerData.slug', 0] },
          serviceTitle: { $arrayElemAt: ['$serviceData.title', 0] },
        },
      },
    ]

    const docs = await db.collection('orders').aggregate(pipeline).toArray()

    const orders: RecentOrderResponse[] = docs.map((doc) => {
      const customerName = doc.providerName || doc.customerEmail || 'Unknown Customer'
      const customerEmail =
        doc.customerEmail || (doc.providerSlug ? `${doc.providerSlug}@provider.com` : 'N/A')
      const productName = doc.serviceTitle || 'Unknown Service'

      return {
        id: doc.orderId || doc._id.toString(),
        orderId: doc.orderId ?? null,
        customer: customerName,
        email: customerEmail,
        product: productName,
        amount: `$${(doc.total || 0).toFixed(2)}`,
        status: mapOrderStatus(doc.status),
        date: new Date(doc.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[Admin Recent Orders API] Error fetching recent orders:', error)
    return NextResponse.json({ error: 'Failed to fetch recent orders' }, { status: 500 })
  }
}
