'use client'

import React from 'react'
import './AdminDashboard.css'

// Types
interface Service {
  id: string
  title: string
}

interface Order {
  id: string
  createdAt: string
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'disputed'
  total: number
  service: Service | string
  customerEmail: string
  stripePaymentIntentId?: string
  disputeId?: string
  disputeStatus?: string
  disputeAmount?: number
  disputeReason?: string
}

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  failedPayments: number
  activeDisputes: number
  recentOrders: Order[]
  disputedOrders: Order[]
  failedOrders: Order[]
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch orders
      const ordersResponse = await fetch('/api/orders?limit=100&depth=1')
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders')
      }

      const ordersData = await ordersResponse.json()
      const orders: Order[] = ordersData.docs || []

      // Calculate statistics
      const totalRevenue = orders
        .filter((order) => order.status === 'paid')
        .reduce((sum, order) => sum + order.total, 0)

      const totalOrders = orders.length
      const failedPayments = orders.filter((order) => order.status === 'failed').length
      const activeDisputes = orders.filter(
        (order) =>
          order.disputeStatus &&
          ['warning_needs_response', 'needs_response', 'under_review'].includes(
            order.disputeStatus,
          ),
      ).length

      // Get recent orders (last 10)
      const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)

      // Get disputed orders
      const disputedOrders = orders.filter((order) => order.disputeId && order.disputeStatus)

      // Get failed orders
      const failedOrders = orders.filter((order) => order.status === 'failed')

      setStats({
        totalRevenue,
        totalOrders,
        failedPayments,
        activeDisputes,
        recentOrders,
        disputedOrders,
        failedOrders,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  const getStripePaymentIntentUrl = (paymentIntentId: string) => {
    return `https://dashboard.stripe.com/payments/${paymentIntentId}`
  }

  const getStripeDisputeUrl = (disputeId: string) => {
    return `https://dashboard.stripe.com/disputes/${disputeId}`
  }

  const getServiceTitle = (service: Service | string) => {
    if (typeof service === 'string') return service
    return service?.title || 'N/A'
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'status-badge status-paid'
      case 'pending':
        return 'status-badge status-pending'
      case 'failed':
        return 'status-badge status-failed'
      case 'refunded':
        return 'status-badge status-refunded'
      case 'disputed':
        return 'status-badge status-disputed'
      default:
        return 'status-badge'
    }
  }

  const getDisputeStatusBadgeClass = (disputeStatus?: string) => {
    if (!disputeStatus) return 'dispute-badge'
    if (disputeStatus.includes('needs_response')) {
      return 'dispute-badge dispute-needs-response'
    }
    if (disputeStatus.includes('under_review')) {
      return 'dispute-badge dispute-under-review'
    }
    if (disputeStatus === 'won') {
      return 'dispute-badge dispute-won'
    }
    if (disputeStatus === 'lost') {
      return 'dispute-badge dispute-lost'
    }
    return 'dispute-badge'
  }

  if (loading) {
    return (
      <div className="admin-dashboard-wrapper">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-dashboard-wrapper">
        <div className="dashboard-error">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Dashboard Overview</h1>
          <button onClick={fetchDashboardData} className="refresh-button">
            ↻ Refresh
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon revenue-icon">💰</div>
            <div className="stat-content">
              <h3>Total Revenue</h3>
              <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
              <span className="stat-label">from paid orders</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orders-icon">📦</div>
            <div className="stat-content">
              <h3>Total Orders</h3>
              <p className="stat-value">{stats.totalOrders}</p>
              <span className="stat-label">all time</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon failed-icon">⚠️</div>
            <div className="stat-content">
              <h3>Failed Payments</h3>
              <p className="stat-value">{stats.failedPayments}</p>
              <span className="stat-label">require attention</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon disputes-icon">⚡</div>
            <div className="stat-content">
              <h3>Active Disputes</h3>
              <p className="stat-value">{stats.activeDisputes}</p>
              <span className="stat-label">need response</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Recent Orders</h2>
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <code>#{order.id.slice(-8)}</code>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{getServiceTitle(order.service)}</td>
                    <td>{order.customerEmail || 'N/A'}</td>
                    <td className="amount-cell">{formatCurrency(order.total)}</td>
                    <td>
                      <span className={getStatusBadgeClass(order.status)}>{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.recentOrders.length === 0 && (
              <div className="empty-state">
                <p>No orders yet</p>
              </div>
            )}
          </div>
        </div>

        {stats.disputedOrders.length > 0 && (
          <div className="dashboard-section alert-section">
            <h2>🚨 Active Disputes</h2>
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Service</th>
                    <th>Amount</th>
                    <th>Dispute Status</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.disputedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <code>#{order.id.slice(-8)}</code>
                      </td>
                      <td>{getServiceTitle(order.service)}</td>
                      <td className="amount-cell">
                        {formatCurrency(order.disputeAmount || order.total)}
                      </td>
                      <td>
                        <span className={getDisputeStatusBadgeClass(order.disputeStatus)}>
                          {order.disputeStatus?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{order.disputeReason || 'N/A'}</td>
                      <td>
                        {order.disputeId && (
                          <a
                            href={getStripeDisputeUrl(order.disputeId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="stripe-link"
                          >
                            View in Stripe →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.failedOrders.length > 0 && (
          <div className="dashboard-section alert-section">
            <h2>⚠️ Failed Payments</h2>
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.failedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <code>#{order.id.slice(-8)}</code>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{getServiceTitle(order.service)}</td>
                      <td>{order.customerEmail || 'N/A'}</td>
                      <td className="amount-cell">{formatCurrency(order.total)}</td>
                      <td>
                        {order.stripePaymentIntentId && (
                          <a
                            href={getStripePaymentIntentUrl(order.stripePaymentIntentId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="stripe-link"
                          >
                            View in Stripe →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
