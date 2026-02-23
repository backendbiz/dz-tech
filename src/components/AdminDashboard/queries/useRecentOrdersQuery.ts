import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'

export interface RecentOrder {
  id: string
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

export function useRecentOrdersQuery() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  return useQuery({
    queryKey: ['recent-orders', { from, to }],
    queryFn: async (): Promise<RecentOrder[]> => {
      // Build URL with date params
      const url = new URL('/api/admin/orders/recent', window.location.origin)
      if (from) url.searchParams.set('from', from)
      if (to) url.searchParams.set('to', to)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to fetch recent orders')
      }

      return response.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
