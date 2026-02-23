'use client'

import Link from 'next/link'
import { useRecentOrdersQuery } from '../queries/useRecentOrdersQuery'

const statusStyles = {
  Completed: 'adm-status-completed',
  Pending: 'adm-status-pending',
  Processing: 'adm-status-processing',
  Cancelled: 'adm-status-cancelled',
  Paid: 'adm-status-completed',
  Failed: 'adm-status-cancelled',
  Refunded: 'adm-status-cancelled',
  Disputed: 'adm-status-processing',
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
  const { data, isLoading, isError } = useRecentOrdersQuery()

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Recent Orders</h2>
          <p className="adm-panel-sub">{data?.length || 0} orders this period</p>
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
