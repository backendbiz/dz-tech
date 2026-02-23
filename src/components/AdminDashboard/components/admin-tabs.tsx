'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/admin-ui/tabs'
import {
  LayoutDashboard,
  ShoppingCart,
  Building2,
  AlertTriangle,
  CircleDollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentView = searchParams.get('view') || 'overview'

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', value)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const tabs = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'orders', label: 'Orders', icon: ShoppingCart },
    { value: 'providers', label: 'Providers', icon: Building2 },
    { value: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { value: 'revenue', label: 'Revenue', icon: CircleDollarSign },
  ]

  return (
    <Tabs value={currentView} onValueChange={handleValueChange}>
      <TabsList className="adm:bg-[#1f1f1f] adm:rounded-full adm:p-1 adm:gap-1 adm:border adm:border-[#333]">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentView === tab.value

          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'adm:flex adm:gap-2 adm:items-center adm:rounded-full adm:px-4 adm:py-2 adm:text-sm adm:font-medium adm:transition-all',
                isActive
                  ? 'adm:bg-[#404040] adm:text-white'
                  : 'adm:text-gray-400 hover:adm:text-gray-200 hover:adm:bg-[#2a2a2a]',
              )}
            >
              {isActive && <Icon className="adm:h-4 adm:w-4" />}
              {tab.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
