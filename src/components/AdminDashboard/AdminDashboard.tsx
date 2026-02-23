'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { QueryProvider } from './providers/QueryProviders'
import { DashboardHeader } from './components/dashboard-header'
import { SectionCards } from './components/section-cards'
import { RecentOrders } from './components/recent-orders'
import { OrdersTab } from './components/orders-tab'
import { ProvidersTab } from './components/providers-tab'
import { DisputesTab } from './components/disputes-tab'
import { ProviderRevenueChart } from './components/provider-revenue-chart'
import { RevenueTab } from './components/revenue-tab'
import { Tabs, TabsContent } from '@/components/admin-ui/tabs'
import { AdminTabs } from './components/admin-tabs'

export function AdminDashboard() {
  const portalRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'overview'

  return (
    <QueryProvider>
      <div className="adm-root" ref={portalRef}>
        <DashboardHeader />
        <main className="adm-main">
          <Tabs value={currentView} className="adm:flex adm:flex-col adm:gap-6">
            <AdminTabs />
            <TabsContent value="overview" className="adm:outline-none">
              <div className="adm:flex adm:flex-col adm:gap-6">
                <SectionCards />
                <ProviderRevenueChart />
                <RecentOrders />
              </div>
            </TabsContent>
            <TabsContent value="orders" className="adm:outline-none">
              <OrdersTab />
            </TabsContent>
            <TabsContent value="providers" className="adm:outline-none">
              <ProvidersTab />
            </TabsContent>
            <TabsContent value="disputes" className="adm:outline-none">
              <DisputesTab />
            </TabsContent>
            <TabsContent value="revenue" className="adm:outline-none">
              <RevenueTab />
            </TabsContent>
          </Tabs>
        </main>
        <div id="admin-dashboard-portal" />
      </div>
    </QueryProvider>
  )
}
