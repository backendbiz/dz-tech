'use client'

import { useRef } from 'react'
import { QueryProvider } from './providers/QueryProviders'
import { DashboardHeader } from './components/dashboard-header'
import { SectionCards } from './components/section-cards'
import { RevenueChart } from './components/revenue-chart'
import { QuickActions } from './components/quick-actions'
import { RecentOrders } from './components/recent-orders'
import { AnalyticsTab } from './components/analytics-tab'
import { NotificationsTab } from './components/notifications-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/admin-ui/tabs'

export function AdminDashboard() {
  const portalRef = useRef<HTMLDivElement>(null)

  return (
    <QueryProvider>
      <div className="adm-root" ref={portalRef}>
        <DashboardHeader />
        <main className="adm-main">
          <Tabs defaultValue="overview" className="adm:flex adm:flex-col adm:gap-6">
            <TabsList>
              <TabsTrigger value="overview" className="adm:flex adm:gap-2 adm:items-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports" disabled>
                Reports
              </TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="adm:outline-none">
              <div className="adm:flex adm:flex-col adm:gap-6">
                <SectionCards />
                {/* <div className="adm-grid-2">
                  <RevenueChart />
                  <QuickActions />
                </div> */}
                <RecentOrders />
              </div>
            </TabsContent>
            <TabsContent value="analytics" className="adm:outline-none">
              <AnalyticsTab />
            </TabsContent>
            <TabsContent value="notifications" className="adm:outline-none">
              <NotificationsTab />
            </TabsContent>
          </Tabs>
        </main>
        <div id="admin-dashboard-portal" />
      </div>
    </QueryProvider>
  )
}
