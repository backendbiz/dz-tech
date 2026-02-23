'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

interface DisputedOrder {
  id: string
  orderId?: string | null
  customerEmail?: string | null
  total: number
  disputeStatus?: string | null
  disputeAmount?: number | null
  disputeReason?: string | null
  createdAt: string
}

function useDisputesQuery() {
  return useQuery({
    queryKey: ['disputed-orders'],
    queryFn: async (): Promise<DisputedOrder[]> => {
      const response = await fetch('/api/admin/disputes')
      if (!response.ok) {
        throw new Error('Failed to fetch disputed orders')
      }
      return response.json()
    },
  })
}

const disputeStatusStyles: Record<string, string> = {
  warning_needs_response: 'adm-status-pending',
  warning_under_review: 'adm-status-processing',
  warning_closed: 'adm-status-completed',
  needs_response: 'adm-status-pending',
  under_review: 'adm-status-processing',
  won: 'adm-status-completed',
  lost: 'adm-status-cancelled',
}

const disputeStatusLabels: Record<string, string> = {
  warning_needs_response: 'Warning - Needs Response',
  warning_under_review: 'Warning - Under Review',
  warning_closed: 'Warning - Closed',
  needs_response: 'Needs Response',
  under_review: 'Under Review',
  won: 'Won',
  lost: 'Lost',
}

function TableSkeleton() {
  return (
    <div className="adm-table-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="adm-table-skeleton-row">
          <div className="adm-skeleton adm-skeleton-sm" />
          <div className="adm-skeleton adm-skeleton-md" />
          <div className="adm-skeleton adm-skeleton-sm" />
        </div>
      ))}
    </div>
  )
}

export function DisputesTab() {
  const { data, isLoading, isError } = useDisputesQuery()

  const totalDisputeAmount = data?.reduce((sum, order) => sum + (order.disputeAmount || 0), 0) || 0

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Disputed Orders</h2>
          <p className="adm-panel-sub">
            {data?.length || 0} disputes · ${totalDisputeAmount.toFixed(2)} at risk
          </p>
        </div>
        <Link href="/admin/collections/orders" className="adm-view-all">
          View All Orders
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
        <div className="adm-error">Failed to load disputes.</div>
      ) : data?.length === 0 ? (
        <div className="adm-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--adm-muted)', fontSize: '1.125rem' }}>No disputed orders</p>
          <p style={{ color: 'var(--adm-muted)', marginTop: '0.5rem' }}>
            All orders are proceeding normally
          </p>
        </div>
      ) : (
        <div className="adm-table-wrapper">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Order Amount</th>
                <th>Dispute Amount</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((order) => (
                <tr key={order.id} className="adm-table-row">
                  <td className="adm-table-id">{order.orderId || order.id}</td>
                  <td>
                    <span className="adm-table-name">{order.customerEmail || 'Unknown'}</span>
                  </td>
                  <td className="adm-table-amount">${order.total?.toFixed(2) || '0.00'}</td>
                  <td className="adm-table-amount" style={{ color: 'var(--adm-red)' }}>
                    ${order.disputeAmount?.toFixed(2) || '0.00'}
                  </td>
                  <td>
                    <span
                      className={`adm-status ${disputeStatusStyles[order.disputeStatus || 'needs_response']}`}
                    >
                      {disputeStatusLabels[order.disputeStatus || 'needs_response']}
                    </span>
                  </td>
                  <td>{order.disputeReason || 'N/A'}</td>
                  <td className="adm-table-date">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
