'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ProviderRevenue {
  providerName: string
  providerSlug: string
  revenue: number
  orderCount: number
}

function useProviderRevenueQuery() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  return useQuery({
    queryKey: ['provider-revenue', { from, to }],
    queryFn: async (): Promise<ProviderRevenue[]> => {
      // Build URL with date params
      const url = new URL('/api/admin/revenue-by-provider', window.location.origin)
      if (from) url.searchParams.set('from', from)
      if (to) url.searchParams.set('to', to)

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch provider revenue')
      }
      return response.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ProviderRevenue }>
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="adm-tooltip">
        <p className="adm-tooltip-label">{data.providerName}</p>
        <p className="adm-tooltip-value">${data.revenue.toLocaleString()}</p>
        <p style={{ color: 'var(--adm-muted)', fontSize: '0.875rem', margin: 0 }}>
          {data.orderCount} orders
        </p>
      </div>
    )
  }
  return null
}

const colors = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#0088FE',
]

export function ProviderRevenueChart() {
  const { data, isLoading } = useProviderRevenueQuery()

  const totalRevenue = data?.reduce((sum, p) => sum + p.revenue, 0) || 0
  const totalOrders = data?.reduce((sum, p) => sum + p.orderCount, 0) || 0

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Revenue by Provider</h2>
          <p className="adm-panel-sub">
            Total: ${totalRevenue.toLocaleString()} · {totalOrders} orders
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="adm-chart-skeleton" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" vertical={false} />
            <XAxis
              dataKey="providerName"
              tick={{ fill: 'var(--adm-muted)', fontSize: 12, fontFamily: 'var(--font-geist)' }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: 'var(--adm-muted)', fontSize: 12, fontFamily: 'var(--font-geist)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => {
                if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
                if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
                return `$${v}`
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--adm-overlay-xs)' }} />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
