'use client'

import { PieChart, Pie, Cell, Label } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

interface RevenuePieChartProps {
  data: {
    totalRevenue: number
    refundedAmount: number
    failedAmount: number
    netRevenue: number
  }
}

const COLORS = {
  total: '#22c55e',
  refunded: '#ef4444',
  failed: '#f97316',
  net: '#3b82f6',
}

const chartConfig = {
  total: { label: 'Total Revenue', color: COLORS.total },
  refunded: { label: 'Refunded', color: COLORS.refunded },
  failed: { label: 'Failed/Lost', color: COLORS.failed },
  net: { label: 'Net Revenue', color: COLORS.net },
}

export function RevenuePieChart({ data }: RevenuePieChartProps) {
  const chartData = [
    { name: 'Total Revenue', value: data.totalRevenue, key: 'total' },
    { name: 'Refunded', value: data.refundedAmount, key: 'refunded' },
    { name: 'Failed/Lost', value: data.failedAmount, key: 'failed' },
    { name: 'Net Revenue', value: data.netRevenue, key: 'net' },
  ].filter((item) => item.value > 0)

  if (chartData.length === 0) {
    return (
      <div className="adm:flex adm:items-center adm:justify-center adm:h-64 adm:text-(--adm-muted)">
        No revenue data available
      </div>
    )
  }

  const totalRevenue = data.totalRevenue

  return (
    <ChartContainer config={chartConfig} className="adm:h-64">
      <PieChart>
        <ChartTooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              const value = payload[0].value as number
              const name = payload[0].name as string
              return (
                <div className="adm:bg-(--adm-surface) adm:border adm:border-(--adm-border) adm:rounded-lg adm:px-2.5 adm:py-1.5 adm:text-xs adm:shadow-lg">
                  <p className="adm:text-(--adm-text) adm:font-medium">{name}</p>
                  <p className="adm:text-(--adm-accent) adm:font-mono">${value.toFixed(2)}</p>
                </div>
              )
            }
            return null
          }}
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.key as keyof typeof COLORS]} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan className="adm:fill-(--adm-text) adm:text-lg adm:font-bold">
                      ${totalRevenue.toFixed(0)}
                    </tspan>
                    <tspan x={viewBox.cx} dy="1.2em" className="adm:fill-(--adm-muted) adm:text-xs">
                      Total
                    </tspan>
                  </text>
                )
              }
              return null
            }}
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  )
}
