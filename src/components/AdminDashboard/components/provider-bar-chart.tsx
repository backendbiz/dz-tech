'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import { useMemo } from 'react'

interface ProviderRevenue {
  providerName: string
  providerSlug: string
  revenue: number
  orderCount: number
  paymentMethods?: { name: string; slug: string; revenue: number; orderCount: number }[]
}

interface ProviderBarChartProps {
  providers: ProviderRevenue[]
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

export function ProviderBarChart({ providers }: ProviderBarChartProps) {
  const { chartData, paymentMethodNames, chartConfig } = useMemo(() => {
    const uniquePaymentMethods = new Set<string>()
    
    // Sort top 10 providers by revenue
    const sortedProviders = [...providers]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Extract all unique payment methods from top providers
    sortedProviders.forEach((p) => {
      if (p.paymentMethods && p.paymentMethods.length > 0) {
        p.paymentMethods.forEach((s) => uniquePaymentMethods.add(s.name))
      } else {
        // Fallback if no payment methods are present
        uniquePaymentMethods.add('Direct')
      }
    })

    const extractedPaymentMethodNames = Array.from(uniquePaymentMethods)

    // Map data for Recharts stacked bar
    const data = sortedProviders.map((p) => {
      const datum: Record<string, any> = {
        name: p.providerName,
        totalRevenue: p.revenue,
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

    // Prepare dynamic ChartContainer config
    const config = extractedPaymentMethodNames.reduce(
      (acc, name, index) => {
        acc[name] = {
          label: name,
          color: colors[index % colors.length],
        }
        return acc
      },
      {} as Record<string, { label: string; color: string }>
    )

    return { chartData: data, paymentMethodNames: extractedPaymentMethodNames, chartConfig: config }
  }, [providers])

  if (chartData.length === 0) {
    return (
      <div className="adm:flex adm:items-center adm:justify-center adm:h-64 adm:text-(--adm-muted)">
        No provider data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="adm:h-[350px]">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
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
          content={({ active, payload, label }) => {
            if (active && payload && payload.length > 0) {
              return (
                <div className="adm:bg-(--adm-surface) adm:border adm:border-(--adm-border) adm:rounded-lg adm:px-3 adm:py-2 adm:text-xs adm:shadow-lg adm:min-w-[150px]">
                  <p className="adm:text-(--adm-text) adm:font-medium adm:mb-2">{label}</p>
                  <div className="adm:flex adm:flex-col adm:gap-1.5">
                    {payload.map((entry, index) => (
                      <div key={index} className="adm:flex adm:items-center adm:justify-between adm:gap-4">
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
                        ${payload.reduce((sum, entry) => sum + Number(entry.value), 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )
            }
            return null
          }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} 
        />
        {paymentMethodNames.map((name, index) => (
          <Bar
            key={name}
            dataKey={name}
            stackId="a"
            fill={colors[index % colors.length]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
