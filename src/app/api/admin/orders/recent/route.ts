import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import type { Order, Service, Provider } from '@/payload-types'
import type { Where } from 'payload'

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

function mapOrderStatus(status: Order['status']): RecentOrderResponse['status'] {
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

    console.log('[Admin Recent Orders API] Starting request...', { from, to })
    const payload = await getPayloadClient()
    console.log('[Admin Recent Orders API] Payload client initialized')

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

    // Get recent orders, sorted by createdAt descending
    console.log('[Admin Recent Orders API] Fetching orders from database...')
    const ordersResult = await payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 10,
      depth: 1, // Populate service and provider relationships
      where: dateFilter,
      overrideAccess: true,
    })
    console.log(`[Admin Recent Orders API] Found ${ordersResult.docs.length} orders`)

    const orders: RecentOrderResponse[] = ordersResult.docs.map((order) => {
      const service = order.service as Service | undefined
      const provider = order.provider as Provider | undefined

      // Get customer name from provider if available, otherwise use email or generic
      const customerName = provider?.name || order.customerEmail || 'Unknown Customer'
      const customerEmail =
        order.customerEmail || (provider ? `${provider.slug}@provider.com` : 'N/A')

      // Get product name from service
      const productName = service?.title || 'Unknown Service'

      return {
        id: order.orderId || order.id,
        orderId: order.orderId,
        customer: customerName,
        email: customerEmail,
        product: productName,
        amount: `$${(order.total || 0).toFixed(2)}`,
        status: mapOrderStatus(order.status),
        date: new Date(order.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }
    })

    console.log('[Admin Recent Orders API] Returning orders:', orders.length)

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[Admin Recent Orders API] Error fetching recent orders:', error)
    return NextResponse.json({ error: 'Failed to fetch recent orders' }, { status: 500 })
  }
}
