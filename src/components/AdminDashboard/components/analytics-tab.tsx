'use client'

import { RevenueChart } from './revenue-chart'
import { QuickActions } from './quick-actions'

export function AnalyticsTab() {
  return (
    <div className="adm:flex adm:flex-col adm:gap-6">
      <div className="adm-grid-2">
        <RevenueChart />
        <QuickActions />
      </div>
    </div>
  )
}
