import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'

export interface StatCard {
  id: string
  title: string
  value: string
  change: string
  changeValue: number
  description: string
  prefix?: string
}

interface OrderStats {
  totalOrders: number
  pendingOrders: number
  failedOrders: number
  recentOrdersCount: number
  paidOrders: number
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function useSectionCardsQuery() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  return useQuery({
    queryKey: ['section-cards', { from, to }],
    queryFn: async (): Promise<StatCard[]> => {
      // Build URL with date params
      const url = new URL('/api/admin/stats', window.location.origin)
      if (from) url.searchParams.set('from', from)
      if (to) url.searchParams.set('to', to)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to fetch order stats')
      }

      const stats: OrderStats = await response.json()

      // Map stats to stat cards with realistic mock changes (until we have historical data)
      const cards: StatCard[] = [
        {
          id: 'total-orders',
          title: 'Total Orders',
          value: formatNumber(stats.totalOrders),
          change: '+5.2%',
          changeValue: 5.2,
          description: 'All orders in the system',
        },
        {
          id: 'pending-orders',
          title: 'Pending Orders',
          value: formatNumber(stats.pendingOrders),
          change: stats.pendingOrders > 0 ? 'Needs attention' : 'All caught up',
          changeValue: stats.pendingOrders > 0 ? -1 : 1,
          description: 'Orders awaiting payment',
        },
        {
          id: 'failed-orders',
          title: 'Failed Orders',
          value: formatNumber(stats.failedOrders),
          change: stats.failedOrders > 0 ? 'Action required' : 'No issues',
          changeValue: stats.failedOrders > 0 ? -1 : 1,
          description: 'Orders with failed payments',
        },
        {
          id: 'successful-orders',
          title: 'Successful Orders',
          value: formatNumber(stats.paidOrders),
          change: '+8.5%',
          changeValue: 8.5,
          description: from && to ? 'Paid orders in selected period' : 'Total paid orders',
        },
      ]

      return cards
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
