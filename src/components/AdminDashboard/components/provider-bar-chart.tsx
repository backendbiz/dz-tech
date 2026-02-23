'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'

interface ProviderRevenue {
  providerName: string
  providerSlug: string
  revenue: number
  orderCount: number
}

interface ProviderBarChartProps {
  providers: ProviderRevenue[]
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#22c55e',
  },
}

export function ProviderBarChart({ providers }: ProviderBarChartProps) {
  const chartData = providers
    .map((p) => ({
      name: p.providerName,
      revenue: p.revenue,
      orders: p.orderCount,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  if (chartData.length === 0) {
    return (
      <div className="adm:flex adm:items-center adm:justify-center adm:h-64 adm:text-(--adm-muted)">
        No provider data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="adm:h-64">
      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={60}
          tick={{ fill: 'var(--adm-text)', fontSize: 12 }}
        />
        <YAxis
          tick={{ fill: 'var(--adm-text)', fontSize: 12 }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              const value = payload[0].value as number
              const name = payload[0].payload.name as string
              return (
                <div className="adm:bg-(--adm-surface) adm:border adm:border-(--adm-border) adm:rounded-lg adm:px-2.5 adm:py-1.5 adm:text-xs adm:shadow-lg">
                  <p className="adm:text-(--adm-text) adm:font-medium">{name}</p>
                  <p className="adm:text-(--adm-green) adm:font-mono">${value.toFixed(2)}</p>
                </div>
              )
            }
            return null
          }}
        />
        <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
