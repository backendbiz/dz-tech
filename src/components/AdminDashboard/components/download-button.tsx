'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useRecentOrdersQuery } from '../queries/useRecentOrdersQuery'
import { toast } from 'sonner'

interface ExportData {
  orders: Array<{
    id: string
    customer: string
    email: string
    product: string
    amount: string
    status: string
    date: string
  }>
  revenue: {
    totalRevenue: number
    paidOrdersCount: number
    averageOrderValue: number
    refundedAmount: number
    failedAmount: number
    pendingAmount: number
  } | null
  stats: {
    totalOrders: number
    pendingOrders: number
    failedOrders: number
    recentOrdersCount: number
  } | null
}

export function DownloadButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const { data: orders = [] } = useRecentOrdersQuery()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchExportData = async (): Promise<ExportData> => {
    const [revenueRes, statsRes] = await Promise.all([
      fetch('/api/admin/revenue'),
      fetch(`/api/admin/stats${from || to ? `?from=${from || ''}&to=${to || ''}` : ''}`),
    ])

    const revenue = revenueRes.ok ? await revenueRes.json() : null
    const stats = statsRes.ok ? await statsRes.json() : null

    return { orders, revenue, stats }
  }

  const convertToCSV = (data: ExportData): string => {
    const lines: string[] = []
    
    // Header
    lines.push('Dashboard Export Report')
    lines.push(`Generated: ${new Date().toLocaleString()}`)
    if (from || to) {
      lines.push(`Date Range: ${from || 'All time'} to ${to || 'Present'}`)
    }
    lines.push('')

    // Revenue Summary
    if (data.revenue) {
      lines.push('REVENUE SUMMARY')
      lines.push('Metric,Value')
      lines.push(`Total Revenue,$${data.revenue.totalRevenue.toFixed(2)}`)
      lines.push(`Paid Orders,${data.revenue.paidOrdersCount}`)
      lines.push(`Average Order Value,$${data.revenue.averageOrderValue.toFixed(2)}`)
      lines.push(`Refunded Amount,$${data.revenue.refundedAmount.toFixed(2)}`)
      lines.push(`Failed Amount,$${data.revenue.failedAmount.toFixed(2)}`)
      lines.push(`Pending Amount,$${data.revenue.pendingAmount.toFixed(2)}`)
      lines.push('')
    }

    // Order Stats
    if (data.stats) {
      lines.push('ORDER STATISTICS')
      lines.push('Metric,Count')
      lines.push(`Total Orders,${data.stats.totalOrders}`)
      lines.push(`Pending Orders,${data.stats.pendingOrders}`)
      lines.push(`Failed Orders,${data.stats.failedOrders}`)
      lines.push(`Recent Orders,${data.stats.recentOrdersCount}`)
      lines.push('')
    }

    // Recent Orders
    if (data.orders.length > 0) {
      lines.push('RECENT ORDERS')
      lines.push('Order ID,Customer,Email,Product,Amount,Status,Date')
      data.orders.forEach(order => {
        lines.push(`"${order.id}","${order.customer}","${order.email}","${order.product}","${order.amount}","${order.status}","${order.date}"`)
      })
    }

    return lines.join('\n')
  }

  const downloadCSV = async () => {
    setIsExporting(true)
    try {
      const data = await fetchExportData()
      const csv = convertToCSV(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `dashboard-report-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('CSV exported successfully')
    } catch (error) {
      toast.error('Failed to export CSV')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  const generatePDFContent = (data: ExportData): string => {
    const dateRange = from || to ? `Date Range: ${from || 'All time'} to ${to || 'Present'}` : ''
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dashboard Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #444; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .summary-item { background: #f9f9f9; padding: 15px; border-radius: 5px; }
          .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 20px; font-weight: bold; color: #1a1a1a; margin-top: 5px; }
          .status-completed { color: #22c55e; }
          .status-pending { color: #f59e0b; }
          .status-failed { color: #ef4444; }
          .status-cancelled { color: #6b7280; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Dashboard Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${dateRange ? `<p>${dateRange}</p>` : ''}
    `

    if (data.revenue) {
      html += `
        <h2>Revenue Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Revenue</div>
            <div class="summary-value">$${data.revenue.totalRevenue.toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Paid Orders</div>
            <div class="summary-value">${data.revenue.paidOrdersCount}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Average Order Value</div>
            <div class="summary-value">$${data.revenue.averageOrderValue.toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Refunded Amount</div>
            <div class="summary-value">$${data.revenue.refundedAmount.toFixed(2)}</div>
          </div>
        </div>
      `
    }

    if (data.stats) {
      html += `
        <h2>Order Statistics</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Orders</div>
            <div class="summary-value">${data.stats.totalOrders}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Pending Orders</div>
            <div class="summary-value">${data.stats.pendingOrders}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Failed Orders</div>
            <div class="summary-value">${data.stats.failedOrders}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Recent Orders</div>
            <div class="summary-value">${data.stats.recentOrdersCount}</div>
          </div>
        </div>
      `
    }

    if (data.orders.length > 0) {
      html += `
        <h2>Recent Orders</h2>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
      `
      
      data.orders.forEach(order => {
        const statusClass = order.status.toLowerCase() === 'completed' ? 'status-completed' :
                           order.status.toLowerCase() === 'pending' ? 'status-pending' :
                           order.status.toLowerCase() === 'failed' ? 'status-failed' :
                           order.status.toLowerCase() === 'cancelled' ? 'status-cancelled' : ''
        html += `
          <tr>
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.email}</td>
            <td>${order.product}</td>
            <td>${order.amount}</td>
            <td class="${statusClass}">${order.status}</td>
            <td>${order.date}</td>
          </tr>
        `
      })
      
      html += '</tbody></table>'
    }

    html += `
        <div class="footer">
          Generated by DZ Tech Admin Dashboard
        </div>
      </body>
      </html>
    `

    return html
  }

  const downloadPDF = async () => {
    setIsExporting(true)
    try {
      const data = await fetchExportData()
      const html = generatePDFContent(data)
      
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Please allow popups to download PDF')
        return
      }
      
      printWindow.document.write(html)
      printWindow.document.close()
      
      // Wait for styles to load then print
      setTimeout(() => {
        printWindow.print()
        toast.success('PDF export opened in print dialog')
      }, 250)
    } catch (error) {
      toast.error('Failed to export PDF')
      console.error('PDF export error:', error)
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="adm:relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="adm:inline-flex adm:items-center adm:justify-center adm:gap-2 adm:px-4 adm:py-2 adm:text-sm adm:font-medium adm:rounded-md adm:transition-all adm:cursor-pointer adm:border adm:border-[var(--adm-border)] adm:bg-[var(--adm-surface)] adm:text-[var(--adm-text)] hover:adm:bg-[var(--adm-surface-hover)] hover:adm:border-[var(--adm-border-strong)] disabled:adm:opacity-50"
      >
        <Download className="adm:h-4 adm:w-4" />
        {isExporting ? 'Exporting...' : 'Download'}
        <ChevronDown className="adm:h-3 adm:w-3" />
      </button>

      {isOpen && (
        <div className="adm:absolute adm:right-0 adm:top-full adm:mt-2 adm:w-48 adm:bg-[var(--adm-surface)] adm:border adm:border-[var(--adm-border)] adm:rounded-md adm:shadow-lg adm:z-50 adm:overflow-hidden">
          <button
            onClick={downloadCSV}
            className="adm:w-full adm:flex adm:items-center adm:gap-3 adm:px-4 adm:py-3 adm:text-sm adm:text-[var(--adm-text)] hover:adm:bg-[var(--adm-surface-hover)] adm:transition-colors"
          >
            <FileSpreadsheet className="adm:h-4 adm:w-4 adm:text-green-500" />
            <div className="adm:text-left">
              <div className="adm:font-medium">Export CSV</div>
              <div className="adm:text-xs adm:text-[var(--adm-text-muted)]">Spreadsheet format</div>
            </div>
          </button>
          <div className="adm:border-t adm:border-[var(--adm-border)]" />
          <button
            onClick={downloadPDF}
            className="adm:w-full adm:flex adm:items-center adm:gap-3 adm:px-4 adm:py-3 adm:text-sm adm:text-[var(--adm-text)] hover:adm:bg-[var(--adm-surface-hover)] adm:transition-colors"
          >
            <FileText className="adm:h-4 adm:w-4 adm:text-red-500" />
            <div className="adm:text-left">
              <div className="adm:font-medium">Export PDF</div>
              <div className="adm:text-xs adm:text-[var(--adm-text-muted)]">Printable report</div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
