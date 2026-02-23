'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const mockData = [
  { month: 'Aug', revenue: 4200 },
  { month: 'Sep', revenue: 5800 },
  { month: 'Oct', revenue: 5200 },
  { month: 'Nov', revenue: 7800 },
  { month: 'Dec', revenue: 9100 },
  { month: 'Jan', revenue: 8400 },
  { month: 'Feb', revenue: 11250 },
]

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="adm-tooltip">
        <p className="adm-tooltip-label">{label}</p>
        <p className="adm-tooltip-value">${payload[0].value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

export function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 600))
      return mockData
    },
  })

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Revenue</h2>
          <p className="adm-panel-sub">Last 7 months</p>
        </div>
        <div className="adm-panel-stat">
          <span className="adm-panel-stat-value">$11,250</span>
          <span className="adm-badge-trend adm-trend-up" style={{ fontSize: '0.7rem' }}>
            +34% vs last month
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="adm-chart-skeleton" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--adm-accent)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--adm-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--adm-muted)', fontSize: 11, fontFamily: 'var(--font-geist)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--adm-muted)', fontSize: 11, fontFamily: 'var(--font-geist)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--adm-border)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--adm-accent)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--adm-accent)', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
