import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useAdminStore, OrderStatus } from '../stores/useAdminStore'

export type Order = {
  id: string
  customer: string
  email: string
  product: string
  amount: string
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Processing'
  date: string
  time: string
}

function mapApiStatus(status: string): Order['status'] {
  switch (status) {
    case 'Completed':
    case 'Paid':
      return 'Completed'
    case 'Pending':
      return 'Pending'
    case 'Failed':
      return 'Cancelled'
    case 'Processing':
    case 'Disputed':
      return 'Processing'
    default:
      return 'Pending'
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

interface OrdersQueryOptions {
  searchQuery?: string
  status?: OrderStatus | null
  sortBy?: string
}

function filterAndSortOrders(orders: Order[], options: OrdersQueryOptions): Order[] {
  let result = [...orders]

  // Filter by search query
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase()
    result = result.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query) ||
        order.product.toLowerCase().includes(query),
    )
  }

  // Filter by status
  if (options.status) {
    result = result.filter((order) => order.status === options.status)
  }

  // Sort
  if (options.sortBy) {
    result.sort((a, b) => {
      switch (options.sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'amount-desc': {
          const amountA = parseFloat(a.amount.replace(/[$,]/g, ''))
          const amountB = parseFloat(b.amount.replace(/[$,]/g, ''))
          return amountB - amountA
        }
        case 'amount-asc': {
          const amountA = parseFloat(a.amount.replace(/[$,]/g, ''))
          const amountB = parseFloat(b.amount.replace(/[$,]/g, ''))
          return amountA - amountB
        }
        case 'name-asc':
          return a.customer.localeCompare(b.customer)
        case 'name-desc':
          return b.customer.localeCompare(a.customer)
        default:
          return 0
      }
    })
  }

  return result
}

export function useOrdersQuery() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const searchQuery = useAdminStore((state) => state.searchQuery)
  const orderStatus = useAdminStore((state) => state.orderStatus)
  const sortBy = useAdminStore((state) => state.sortBy)

  return useQuery({
    queryKey: ['orders', { from, to, searchQuery, orderStatus, sortBy }],
    queryFn: async (): Promise<Order[]> => {
      // Build URL with date params
      const url = new URL('/api/admin/orders/recent', window.location.origin)
      if (from) url.searchParams.set('from', from)
      if (to) url.searchParams.set('to', to)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()

      // Map API response to Order type
      const orders: Order[] = data.map(
        (order: {
          id: string
          customer: string
          email: string
          product: string
          amount: string
          status: string
          date: string
          createdAt?: string
        }) => ({
          id: order.id,
          customer: order.customer,
          email: order.email,
          product: order.product,
          amount: order.amount,
          status: mapApiStatus(order.status),
          date: order.date,
          time: order.createdAt ? formatTime(order.createdAt) : '--:--',
        }),
      )

      return filterAndSortOrders(orders, {
        searchQuery,
        status: orderStatus,
        sortBy,
      })
    },
  })
}

export function useOrdersCount() {
  const { data: orders } = useOrdersQuery()
  return { total: orders?.length || 0 }
}
