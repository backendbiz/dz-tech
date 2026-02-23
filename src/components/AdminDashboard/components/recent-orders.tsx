'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

interface Order {
  id: string
  customer: string
  email: string
  product: string
  amount: string
  status: 'Completed' | 'Pending' | 'Processing' | 'Cancelled'
  date: string
}

const mockOrders: Order[] = [
  {
    id: 'ORD-002',
    customer: 'Bob Smith',
    email: 'bob@example.com',
    product: 'Starter Plan',
    amount: '$29.00',
    status: 'Pending',
    date: 'Feb 21, 2026',
  },
  {
    id: 'ORD-003',
    customer: 'Carol White',
    email: 'carol@example.com',
    product: 'Enterprise Plan',
    amount: '$299.00',
    status: 'Processing',
    date: 'Feb 21, 2026',
  },
  {
    id: 'ORD-001',
    customer: 'Alice Johnson',
    email: 'alice@example.com',
    product: 'Pro Plan',
    amount: '$99.00',
    status: 'Completed',
    date: 'Feb 20, 2026',
  },
  {
    id: 'ORD-004',
    customer: 'David Lee',
    email: 'david@example.com',
    product: 'Pro Plan',
    amount: '$99.00',
    status: 'Cancelled',
    date: 'Feb 19, 2026',
  },
  {
    id: 'ORD-005',
    customer: 'Eva Martinez',
    email: 'eva@example.com',
    product: 'Starter Plan',
    amount: '$29.00',
    status: 'Completed',
    date: 'Feb 18, 2026',
  },
  {
    id: 'ORD-006',
    customer: 'Frank Brown',
    email: 'frank@example.com',
    product: 'Pro Plan',
    amount: '$99.00',
    status: 'Completed',
    date: 'Feb 17, 2026',
  },
]

const statusStyles: Record<Order['status'], string> = {
  Completed: 'adm-status-completed',
  Pending: 'adm-status-pending',
  Processing: 'adm-status-processing',
  Cancelled: 'adm-status-cancelled',
}

function TableSkeleton() {
  return (
    <div className="adm-table-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="adm-table-skeleton-row">
          <div className="adm-skeleton adm-skeleton-sm" />
          <div className="adm-skeleton adm-skeleton-md" />
          <div className="adm-skeleton adm-skeleton-sm" />
          <div className="adm-skeleton adm-skeleton-xs" />
        </div>
      ))}
    </div>
  )
}

export function RecentOrders() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async (): Promise<Order[]> => {
      await new Promise((r) => setTimeout(r, 700))
      return mockOrders
    },
  })

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Recent Orders</h2>
          <p className="adm-panel-sub">{mockOrders.length} orders this period</p>
        </div>
        <Link href="/admin/collections/orders" className="adm-view-all">
          View all
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="adm-error">Failed to load orders.</div>
      ) : (
        <div className="adm-table-wrapper">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((order) => (
                <tr key={order.id} className="adm-table-row">
                  <td className="adm-table-id">{order.id}</td>
                  <td>
                    <span className="adm-table-name">{order.customer}</span>
                    <span className="adm-table-email">{order.email}</span>
                  </td>
                  <td>{order.product}</td>
                  <td className="adm-table-amount">{order.amount}</td>
                  <td>
                    <span className={`adm-status ${statusStyles[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="adm-table-date">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
