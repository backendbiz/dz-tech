import { getDb } from '@/lib/mongodb'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const service = searchParams.get('service')
    const statuses = searchParams.getAll('status')

    const db = await getDb()
    const ordersCollection = db.collection('orders')

    // Build $match stage (mirrors the previous Payload Where filters)
    const match: Record<string, unknown> = {}

    // Status filter — default to 'paid' if none provided
    const activeStatuses = statuses.length > 0 ? statuses : ['paid']
    match.status = activeStatuses.length === 1 ? activeStatuses[0] : { $in: activeStatuses }

    // Date filter
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

    // Service filter
    if (service) {
      match.service = new ObjectId(service)
    }

    const pipeline = [
      // 1. Filter orders
      { $match: match },

      // 2. Normalize paymentMethod early so nulls become 'unknown'
      {
        $addFields: {
          paymentMethod: { $ifNull: ['$paymentMethod', 'unknown'] },
        },
      },

      // 3. First group: provider + paymentMethod → subtotals
      {
        $group: {
          _id: {
            provider: '$provider', // ObjectId or null for direct orders
            paymentMethod: '$paymentMethod',
          },
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },

      // 4. Second group: provider only → roll up paymentMethod breakdown
      {
        $group: {
          _id: '$_id.provider',
          revenue: { $sum: '$revenue' },
          orderCount: { $sum: '$orderCount' },
          paymentMethods: {
            $push: {
              slug: '$_id.paymentMethod',
              revenue: '$revenue',
              orderCount: '$orderCount',
            },
          },
        },
      },

      // 5. Lookup provider name + slug from providers collection
      {
        $lookup: {
          from: 'providers',
          localField: '_id',
          foreignField: '_id',
          as: 'providerData',
        },
      },

      // 6. Shape final output to match previous API response exactly
      {
        $project: {
          _id: 0,
          providerName: {
            $ifNull: [{ $arrayElemAt: ['$providerData.name', 0] }, 'Direct Orders'],
          },
          providerSlug: {
            $ifNull: [{ $arrayElemAt: ['$providerData.slug', 0] }, 'direct'],
          },
          revenue: 1,
          orderCount: 1,
          // Capitalise first letter of each payment method slug → name
          paymentMethods: {
            $map: {
              input: '$paymentMethods',
              as: 'pm',
              in: {
                slug: '$$pm.slug',
                name: {
                  $concat: [
                    { $toUpper: { $substrCP: ['$$pm.slug', 0, 1] } },
                    { $substrCP: ['$$pm.slug', 1, { $strLenCP: '$$pm.slug' }] },
                  ],
                },
                revenue: '$$pm.revenue',
                orderCount: '$$pm.orderCount',
              },
            },
          },
        },
      },

      // 7. Sort paymentMethods by revenue desc inside each provider
      {
        $addFields: {
          paymentMethods: {
            $sortArray: { input: '$paymentMethods', sortBy: { revenue: -1 } },
          },
        },
      },

      // 8. Sort providers by revenue desc
      { $sort: { revenue: -1 } },
    ]

    const providers = await ordersCollection.aggregate(pipeline).toArray()

    return NextResponse.json(providers)
  } catch (error) {
    console.error('[Admin Provider Revenue API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch provider revenue' }, { status: 500 })
  }
}
