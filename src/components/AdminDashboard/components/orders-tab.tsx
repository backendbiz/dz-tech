'use client'

import Link from 'next/link'
import { useOrdersQuery, useOrdersCount } from '../queries/useOrdersQuery'
import { SearchInput } from './search-input'
import { FilterBar } from './filter-bar'

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
      {Array.from({ length: 10 }).map((_, i) => (
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

function EmptyState({ message = 'No orders found matching your criteria.' }: { message?: string }) {
  return (
    <div className="adm:py-16 adm:text-center">
      <div className="adm:mx-auto adm:w-16 adm:h-16 adm:rounded-full adm:bg-(--adm-overlay-sm) adm:flex adm:items-center adm:justify-center adm:mb-4">
        <svg
          className="adm:w-8 adm:h-8 adm:text-(--adm-muted)"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="adm:text-(--adm-muted) adm:text-base">{message}</p>
    </div>
  )
}

export function OrdersTab() {
  const { data, isLoading, isError } = useOrdersQuery()
  const { total } = useOrdersCount()

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">All Orders</h2>
          <p className="adm-panel-sub">{total} total orders</p>
        </div>
        <Link href="/admin/collections/orders" className="adm-view-all">
          Manage Orders
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

      {/* Search and Filters */}
      <div className="adm:flex adm:flex-row adm:gap-3 adm:items-start">
        <div className="adm:flex-1">
          <SearchInput placeholder="Search by order ID, customer, email..." />
        </div>
        <FilterBar type="orders" totalCount={total} filteredCount={data?.length || 0} inline />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="adm-error">Failed to load orders.</div>
      ) : data?.length === 0 ? (
        <EmptyState />
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
                <th>Time</th>
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
                  <td className="adm-table-time">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
