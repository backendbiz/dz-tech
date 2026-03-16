'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ProviderRevenue {
  providerName: string
  providerSlug: string
  revenue: number
  orderCount: number
  paymentMethods?: { name: string; slug: string; revenue: number; orderCount: number }[]
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

const colors = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#ef4444', // red
  '#10b981', // emerald
  '#f97316', // orange
]

export function ProviderRevenueChart() {
  const { data, isLoading } = useProviderRevenueQuery()

  const totalRevenue = data?.reduce((sum, p) => sum + p.revenue, 0) || 0
  const totalOrders = data?.reduce((sum, p) => sum + p.orderCount, 0) || 0

  const { chartData, paymentMethodNames } = useMemo(() => {
    if (!data) return { chartData: [], paymentMethodNames: [] }

    const uniquePaymentMethods = new Set<string>()

    // Use all providers for overview (or we can cap to 10 if there are too many)
    const sortedProviders = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    // Extract all unique payment methods
    sortedProviders.forEach((p) => {
      if (p.paymentMethods && p.paymentMethods.length > 0) {
        p.paymentMethods.forEach((s) => uniquePaymentMethods.add(s.name))
      } else {
        uniquePaymentMethods.add('Direct')
      }
    })

    const extractedPaymentMethodNames = Array.from(uniquePaymentMethods)

    const mappedData = sortedProviders.map((p) => {
      const datum: Record<string, any> = {
        name: p.providerName,
        totalRevenue: p.revenue,
        orderCount: p.orderCount,
      }

      if (p.paymentMethods && p.paymentMethods.length > 0) {
        p.paymentMethods.forEach((s) => {
          datum[s.name] = s.revenue
        })
      } else {
        datum['Direct'] = p.revenue
      }

      return datum
    })

    return { chartData: mappedData, paymentMethodNames: extractedPaymentMethodNames }
  }, [data])

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Revenue by Provider</h2>
          <p className="adm-panel-sub">
            Total: ${totalRevenue.toLocaleString()} · {totalOrders} paid orders
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="adm-chart-skeleton" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" vertical={false} />
            <XAxis
              dataKey="name"
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
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  // The base provider object is accessible through payload[0].payload
                  const orderCount = payload[0].payload.orderCount || 0

                  return (
                    <div className="adm-tooltip adm:bg-(--adm-surface) adm:border adm:border-(--adm-border) adm:rounded-lg adm:px-3 adm:py-2 adm:text-xs adm:shadow-lg adm:min-w-[150px]">
                      <p className="adm-tooltip-label adm:font-medium adm:mb-2">{label}</p>
                      <p
                        style={{
                          color: 'var(--adm-muted)',
                          fontSize: '0.875rem',
                          marginBottom: '8px',
                        }}
                      >
                        {orderCount} orders
                      </p>

                      <div className="adm:flex adm:flex-col adm:gap-1.5">
                        {payload.map((entry, index) => (
                          <div
                            key={index}
                            className="adm:flex adm:items-center adm:justify-between adm:gap-4"
                          >
                            <div className="adm:flex adm:items-center adm:gap-1.5">
                              <div
                                className="adm:w-2 adm:h-2 adm:rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="adm:text-(--adm-muted)">{entry.name}</span>
                            </div>
                            <span className="adm:font-mono adm:text-(--adm-text)">
                              ${Number(entry.value).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {payload.length > 1 && (
                        <div className="adm:mt-2 adm:pt-2 adm:border-t adm:border-(--adm-border) adm:flex adm:items-center adm:justify-between adm:font-medium">
                          <span className="adm:text-(--adm-text)">Total</span>
                          <span className="adm:text-(--adm-green) adm:font-mono">
                            $
                            {payload
                              .reduce((sum, entry) => sum + Number(entry.value), 0)
                              .toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              }}
              cursor={{ fill: 'var(--adm-overlay-xs)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
            {paymentMethodNames.map((name, index) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="a"
                fill={colors[index % colors.length]}
                radius={index === paymentMethodNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={60}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
