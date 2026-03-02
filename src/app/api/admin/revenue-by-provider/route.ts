import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'
import type { Where } from 'payload'

interface ProviderRevenue {
  providerName: string
  providerSlug: string
  revenue: number
  orderCount: number
  services?: { name: string; slug: string; revenue: number; orderCount: number }[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const service = searchParams.get('service')
    const statuses = searchParams.getAll('status')

    const payload = await getPayloadClient()

    // Build filter conditions
    const filters: Where[] = []

    // Date filter
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
      filters.push({ createdAt: createdAtFilter })
    }

    // Status filter (multiple statuses supported)
    if (statuses.length > 0) {
      if (statuses.length === 1) {
        filters.push({ status: { equals: statuses[0] } })
      } else {
        filters.push({ status: { in: statuses } })
      }
    } else {
      // Default to paid only if no status specified
      filters.push({ status: { equals: 'paid' } })
    }

    // Service filter
    if (service) {
      filters.push({ service: { equals: service } })
    }

    // Build final where clause
    const whereClause: Where =
      filters.length > 1
        ? { and: filters }
        : filters.length === 1
          ? filters[0]
          : { status: { equals: 'paid' } }

    // Get orders with filters
    const result = await payload.find({
      collection: 'orders',
      where: whereClause,
      depth: 2, // Populate provider and service
      limit: 1000,
      overrideAccess: true,
    })

    // Group revenue by provider
    const revenueByProvider = new Map<
      string,
      ProviderRevenue & {
        servicesBySlug: Map<
          string,
          { name: string; slug: string; revenue: number; orderCount: number }
        >
      }
    >()

    for (const order of result.docs) {
      const provider = order.provider as { name: string; slug: string } | undefined
      const providerName = provider?.name || 'Direct Orders'
      const providerSlug = provider?.slug || 'direct'
      const serviceData =
        order.service && typeof order.service === 'object'
          ? (order.service as { name?: string; slug?: string })
          : undefined

      const existing = revenueByProvider.get(providerSlug)
      if (existing) {
        existing.revenue += order.total || 0
        existing.orderCount += 1

        // Track service breakdown
        if (serviceData?.slug) {
          const serviceEntry = existing.servicesBySlug.get(serviceData.slug)
          if (serviceEntry) {
            serviceEntry.revenue += order.total || 0
            serviceEntry.orderCount += 1
          } else {
            existing.servicesBySlug.set(serviceData.slug, {
              name: serviceData.name || serviceData.slug,
              slug: serviceData.slug,
              revenue: order.total || 0,
              orderCount: 1,
            })
          }
        }
      } else {
        const servicesBySlug = new Map<
          string,
          { name: string; slug: string; revenue: number; orderCount: number }
        >()
        if (serviceData?.slug) {
          servicesBySlug.set(serviceData.slug, {
            name: serviceData.name || serviceData.slug,
            slug: serviceData.slug,
            revenue: order.total || 0,
            orderCount: 1,
          })
        }
        revenueByProvider.set(providerSlug, {
          providerName,
          providerSlug,
          revenue: order.total || 0,
          orderCount: 1,
          servicesBySlug,
        })
      }
    }

    // Convert to array and sort by revenue (descending)
    const providers = Array.from(revenueByProvider.values())
      .map((p) => ({
        providerName: p.providerName,
        providerSlug: p.providerSlug,
        revenue: p.revenue,
        orderCount: p.orderCount,
        services: Array.from(p.servicesBySlug.values()).sort((a, b) => b.revenue - a.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json(providers)
  } catch (error) {
    console.error('[Admin Provider Revenue API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch provider revenue' }, { status: 500 })
  }
}
