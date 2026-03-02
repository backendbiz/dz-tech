'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ArrowUpDown, Building2, X, Layers, CheckSquare } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAdminStore } from '../stores/useAdminStore'
import { RevenuePieChart } from './revenue-pie-chart'
import { ProviderBarChart } from './provider-bar-chart'

interface RevenueStats {
  totalRevenue: number
  paidOrdersCount: number
  averageOrderValue: number
  refundedAmount: number
  failedAmount: number
  pendingAmount: number
}

interface ProviderRevenue {
  providerName: string
  providerSlug: string
  revenue: number
  orderCount: number
}

type SortOption =
  | 'revenue-desc'
  | 'revenue-asc'
  | 'orders-desc'
  | 'orders-asc'
  | 'name-asc'
  | 'name-desc'

const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Revenue: High to low', value: 'revenue-desc' },
  { label: 'Revenue: Low to high', value: 'revenue-asc' },
  { label: 'Orders: High to low', value: 'orders-desc' },
  { label: 'Orders: Low to high', value: 'orders-asc' },
  { label: 'Name: A to Z', value: 'name-asc' },
  { label: 'Name: Z to A', value: 'name-desc' },
]

function useRevenueQuery() {
  return useQuery({
    queryKey: ['revenue-stats'],
    queryFn: async (): Promise<RevenueStats> => {
      const response = await fetch('/api/admin/revenue')
      if (!response.ok) {
        throw new Error('Failed to fetch revenue stats')
      }
      return response.json()
    },
  })
}

function useServicesQuery() {
  return useQuery({
    queryKey: ['services-list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/services')
      if (!response.ok) {
        throw new Error('Failed to fetch services')
      }
      return response.json() as Promise<{ name: string; slug: string }[]>
    },
  })
}

function useProvidersQuery() {
  return useQuery({
    queryKey: ['providers-list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/providers')
      if (!response.ok) {
        throw new Error('Failed to fetch providers')
      }
      return response.json()
    },
  })
}

function useProviderRevenueQuery(service?: string | null, statuses?: string[]) {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  return useQuery({
    queryKey: ['revenue-by-provider', { from, to, service, statuses }],
    queryFn: async (): Promise<ProviderRevenue[]> => {
      const url = new URL('/api/admin/revenue-by-provider', window.location.origin)
      if (from) url.searchParams.set('from', from)
      if (to) url.searchParams.set('to', to)
      if (service) url.searchParams.set('service', service)
      statuses?.forEach((status) => url.searchParams.append('status', status))

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch provider revenue')
      }
      return response.json()
    },
  })
}

function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  trend,
  description,
  color = 'default',
}: {
  title: string
  value: string | number
  prefix?: string
  suffix?: string
  trend?: string
  description: string
  color?: 'default' | 'green' | 'red' | 'amber'
}) {
  const colorStyles = {
    default: 'var(--adm-text)',
    green: 'var(--adm-green)',
    red: 'var(--adm-red)',
    amber: 'var(--adm-amber)',
  }

  return (
    <div className="adm-card">
      <div className="adm-card-top">
        <span className="adm-card-title">{title}</span>
        {trend && <span className="adm-badge-trend adm-trend-up">{trend}</span>}
      </div>
      <div className="adm-card-value" style={{ color: colorStyles[color], fontSize: '2.25rem' }}>
        {prefix}
        {value}
        {suffix}
      </div>
      <div className="adm-card-divider" />
      <p className="adm-card-desc">{description}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="adm-card adm-skeleton-card">
      <div className="adm-skeleton adm-skeleton-sm" />
      <div className="adm-skeleton adm-skeleton-lg" />
      <div className="adm-skeleton adm-skeleton-md" />
    </div>
  )
}

function ProviderFilter({
  providers,
  selectedProvider,
  onChange,
}: {
  providers: { name: string; slug: string }[]
  selectedProvider: string | null
  onChange: (provider: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = selectedProvider
    ? providers.find((p) => p.slug === selectedProvider)?.name || selectedProvider
    : 'All providers'

  return (
    <div ref={containerRef} className="adm:relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="adm:flex adm:items-center adm:gap-2 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) adm:transition-colors"
        type="button"
      >
        <Building2 className="adm:w-4 adm:h-4 adm:text-(--adm-muted)" />
        <span className="adm:hidden sm:adm:inline">{selectedLabel}</span>
        <span className="adm:inline sm:adm:hidden">Provider</span>
        <ChevronDown
          className={`adm:w-4 adm:h-4 adm:text-(--adm-muted) adm:transition-transform ${isOpen ? 'adm:rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="adm:absolute adm:top-full adm:mt-2 adm:left-0 adm:z-50 adm:min-w-[200px] adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:shadow-lg adm:shadow-black/20 adm:overflow-hidden">
          <button
            onClick={() => {
              onChange(null)
              setIsOpen(false)
            }}
            className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:transition-colors ${
              !selectedProvider
                ? 'adm:bg-(--adm-accent-dim) adm:text-(--adm-accent) adm:font-medium'
                : 'adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover)'
            }`}
          >
            All providers
          </button>
          {providers.map((provider) => (
            <button
              key={provider.slug}
              onClick={() => {
                onChange(provider.slug)
                setIsOpen(false)
              }}
              className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:transition-colors ${
                selectedProvider === provider.slug
                  ? 'adm:bg-(--adm-accent-dim) adm:text-(--adm-accent) adm:font-medium'
                  : 'adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover)'
              }`}
            >
              {provider.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const statusOptions = [
  { label: 'Paid', value: 'paid', color: 'green' },
  { label: 'Pending', value: 'pending', color: 'amber' },
  { label: 'Failed', value: 'failed', color: 'red' },
  { label: 'Refunded', value: 'refunded', color: 'gray' },
  { label: 'Disputed', value: 'disputed', color: 'orange' },
]

function ServiceFilter({
  services,
  selectedService,
  onChange,
}: {
  services: { name: string; slug: string }[]
  selectedService: string | null
  onChange: (service: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = selectedService
    ? services.find((s) => s.slug === selectedService)?.name || selectedService
    : 'All services'

  return (
    <div ref={containerRef} className="adm:relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="adm:flex adm:items-center adm:gap-2 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) adm:transition-colors"
        type="button"
      >
        <Layers className="adm:w-4 adm:h-4 adm:text-(--adm-muted)" />
        <span className="adm:hidden sm:adm:inline">{selectedLabel}</span>
        <span className="adm:inline sm:adm:hidden">Service</span>
        <ChevronDown
          className={`adm:w-4 adm:h-4 adm:text-(--adm-muted) adm:transition-transform ${isOpen ? 'adm:rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="adm:absolute adm:top-full adm:left-0 adm:mt-2 adm:z-50 adm:min-w-[200px] adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:shadow-lg adm:shadow-black/20 adm:overflow-hidden">
          <button
            onClick={() => {
              onChange(null)
              setIsOpen(false)
            }}
            className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:transition-colors ${
              !selectedService
                ? 'adm:bg-(--adm-accent-dim) adm:text-(--adm-accent) adm:font-medium'
                : 'adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover)'
            }`}
          >
            All services
          </button>
          {services.map((service) => (
            <button
              key={service.slug}
              onClick={() => {
                onChange(service.slug)
                setIsOpen(false)
              }}
              className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:transition-colors ${
                selectedService === service.slug
                  ? 'adm:bg-(--adm-accent-dim) adm:text-(--adm-accent) adm:font-medium'
                  : 'adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover)'
              }`}
            >
              {service.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusFilter({
  selectedStatuses,
  onChange,
}: {
  selectedStatuses: string[]
  onChange: (statuses: string[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onChange([...selectedStatuses, status])
    }
  }

  const displayLabel =
    selectedStatuses.length === 0
      ? 'All statuses'
      : selectedStatuses.length === 1
        ? statusOptions.find((s) => s.value === selectedStatuses[0])?.label || 'Status'
        : `${selectedStatuses.length} statuses`

  return (
    <div ref={containerRef} className="adm:relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="adm:flex adm:items-center adm:gap-2 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) adm:transition-colors"
        type="button"
      >
        <CheckSquare className="adm:w-4 adm:h-4 adm:text-(--adm-muted)" />
        <span className="adm:hidden sm:adm:inline">{displayLabel}</span>
        <span className="adm:inline sm:adm:hidden">Status</span>
        <ChevronDown
          className={`adm:w-4 adm:h-4 adm:text-(--adm-muted) adm:transition-transform ${isOpen ? 'adm:rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="adm:absolute adm:top-full adm:right-0 adm:mt-2 adm:z-50 adm:min-w-[180px] adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:shadow-lg adm:shadow-black/20 adm:overflow-hidden">
          {statusOptions.map((option) => {
            const isSelected = selectedStatuses.includes(option.value)
            return (
              <button
                key={option.value}
                onClick={() => toggleStatus(option.value)}
                className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:flex adm:items-center adm:gap-2 adm:transition-colors ${
                  isSelected
                    ? 'adm:bg-(--adm-accent-dim) adm:text-(--adm-accent) adm:font-medium'
                    : 'adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover)'
                }`}
              >
                <div
                  className={`adm:w-4 adm:h-4 adm:rounded adm:border ${
                    isSelected
                      ? 'adm:bg-(--adm-accent) adm:border-(--adm-accent)'
                      : 'adm:border-(--adm-border)'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="adm:w-4 adm:h-4 adm:text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SortFilter({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (value: SortOption) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = sortOptions.find((opt) => opt.value === value)?.label || 'Sort'

  return (
    <div ref={containerRef} className="adm:relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="adm:flex adm:items-center adm:gap-2 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) adm:transition-colors"
        type="button"
      >
        <ArrowUpDown className="adm:w-4 adm:h-4 adm:text-(--adm-muted)" />
        <span className="adm:hidden sm:adm:inline">{selectedLabel}</span>
        <span className="adm:inline sm:adm:hidden">Sort</span>
        <ChevronDown
          className={`adm:w-4 adm:h-4 adm:text-(--adm-muted) adm:transition-transform ${isOpen ? 'adm:rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="adm:absolute adm:top-full adm:right-0 adm:mt-2 adm:z-50 adm:min-w-[180px] adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:shadow-lg adm:shadow-black/20 adm:overflow-hidden">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:transition-colors ${
                value === option.value
                  ? 'adm:bg-(--adm-accent-dim) adm:text-(--adm-accent) adm:font-medium'
                  : 'adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover)'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function RevenueTab() {
  const { data: stats, isLoading: isLoadingStats, isError: isStatsError } = useRevenueQuery()
  const { data: providers = [], isLoading: isLoadingProviders } = useProvidersQuery()
  const { data: services = [], isLoading: _isLoadingServices } = useServicesQuery()

  const revenueProviderFilter = useAdminStore((state) => state.revenueProviderFilter)
  const setRevenueProviderFilter = useAdminStore((state) => state.setRevenueProviderFilter)
  const revenueServiceFilter = useAdminStore((state) => state.revenueServiceFilter)
  const setRevenueServiceFilter = useAdminStore((state) => state.setRevenueServiceFilter)
  const revenueStatusFilters = useAdminStore((state) => state.revenueStatusFilters)
  const setRevenueStatusFilters = useAdminStore((state) => state.setRevenueStatusFilters)
  const clearRevenueFilters = useAdminStore((state) => state.clearRevenueFilters)

  const { data: providerRevenue = [], isLoading: isLoadingProviderRevenue } =
    useProviderRevenueQuery(revenueServiceFilter, revenueStatusFilters)

  const [sortBy, setSortBy] = useState<SortOption>('revenue-desc')

  const hasFilters =
    revenueProviderFilter !== null ||
    revenueServiceFilter !== null ||
    revenueStatusFilters.length > 0

  const filteredAndSortedProviders = useMemo(() => {
    let result = [...providerRevenue]

    if (revenueProviderFilter) {
      result = result.filter((p) => p.providerSlug === revenueProviderFilter)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'revenue-desc':
          return b.revenue - a.revenue
        case 'revenue-asc':
          return a.revenue - b.revenue
        case 'orders-desc':
          return b.orderCount - a.orderCount
        case 'orders-asc':
          return a.orderCount - b.orderCount
        case 'name-asc':
          return a.providerName.localeCompare(b.providerName)
        case 'name-desc':
          return b.providerName.localeCompare(a.providerName)
        default:
          return 0
      }
    })

    return result
  }, [providerRevenue, revenueProviderFilter, sortBy])

  const filteredStats = useMemo(() => {
    if (!revenueProviderFilter || !stats) return stats

    const provider = providerRevenue.find((p) => p.providerSlug === revenueProviderFilter)
    if (!provider) return stats

    return {
      ...stats,
      totalRevenue: provider.revenue,
      paidOrdersCount: provider.orderCount,
      averageOrderValue: provider.orderCount > 0 ? provider.revenue / provider.orderCount : 0,
    }
  }, [stats, revenueProviderFilter, providerRevenue])

  if (isLoadingStats || isLoadingProviders) {
    return (
      <div className="adm-cards-grid">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isStatsError) {
    return <div className="adm-error">Failed to load revenue data.</div>
  }

  const displayStats = filteredStats || stats!

  return (
    <div className="adm:flex adm:flex-col adm:gap-6">
      {/* Filter bar */}
      <div className="adm:flex adm:flex-wrap adm:items-center adm:justify-end adm:gap-2">
        <StatusFilter selectedStatuses={revenueStatusFilters} onChange={setRevenueStatusFilters} />
        <ServiceFilter
          services={services.map((s: { name: string; slug: string }) => ({
            name: s.name,
            slug: s.slug,
          }))}
          selectedService={revenueServiceFilter}
          onChange={setRevenueServiceFilter}
        />
        <ProviderFilter
          providers={providers.map((p: { name: string; slug: string }) => ({
            name: p.name,
            slug: p.slug,
          }))}
          selectedProvider={revenueProviderFilter}
          onChange={setRevenueProviderFilter}
        />
        <SortFilter value={sortBy} onChange={setSortBy} />
        {hasFilters && (
          <button
            onClick={clearRevenueFilters}
            className="adm:flex adm:items-center adm:gap-1.5 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:text-(--adm-muted) hover:adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) adm:transition-colors"
            type="button"
          >
            <X className="adm:w-4 adm:h-4" />
            Clear filters
          </button>
        )}
      </div>

      <div className="adm-cards-grid">
        <StatCard
          title="Total Revenue"
          value={displayStats.totalRevenue.toFixed(2)}
          prefix="$"
          trend="+8.2%"
          description={revenueProviderFilter ? 'From selected provider' : 'From paid orders'}
          color="green"
        />
        <StatCard
          title="Average Order Value"
          value={displayStats.averageOrderValue.toFixed(2)}
          prefix="$"
          description="Per successful order"
        />
        <StatCard
          title="Paid Orders"
          value={displayStats.paidOrdersCount}
          description="Successfully completed"
          color="default"
        />
        <StatCard
          title="Pending Revenue"
          value={displayStats.pendingAmount.toFixed(2)}
          prefix="$"
          description="Awaiting payment"
          color="amber"
        />
      </div>

      {/* Provider Revenue Breakdown */}
      <div className="adm-panel">
        <div className="adm-panel-header">
          <div>
            <h2 className="adm-panel-title">Revenue by Provider</h2>
            <p className="adm-panel-sub">
              {filteredAndSortedProviders.length} provider
              {filteredAndSortedProviders.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {isLoadingProviderRevenue ? (
          <div className="adm:py-8 adm:text-center adm:text-(--adm-muted)">
            Loading provider data...
          </div>
        ) : filteredAndSortedProviders.length === 0 ? (
          <div className="adm:py-8 adm:text-center adm:text-(--adm-muted)">
            No providers found for the selected filter.
          </div>
        ) : (
          <div className="adm:table-wrapper">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProviders.map((provider) => {
                  const totalRev = providerRevenue.reduce((sum, p) => sum + p.revenue, 0)
                  const percentage =
                    totalRev > 0 ? ((provider.revenue / totalRev) * 100).toFixed(1) : '0.0'

                  return (
                    <tr key={provider.providerSlug} className="adm-table-row">
                      <td className="adm-table-name">{provider.providerName}</td>
                      <td>{provider.orderCount}</td>
                      <td className="adm-table-amount">${provider.revenue.toFixed(2)}</td>
                      <td>
                        <div className="adm:flex adm:items-center adm:gap-2">
                          <div className="adm:w-24 adm:h-2 adm:bg-(--adm-overlay-sm) adm:rounded-full adm:overflow-hidden">
                            <div
                              className="adm:h-full adm:bg-(--adm-green) adm:rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="adm:text-sm adm:text-(--adm-muted)">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue Charts */}
      {!revenueProviderFilter && stats && (
        <div className="adm:grid adm:grid-cols-1 lg:adm:grid-cols-2 adm:gap-6">
          {/* Pie Chart Card */}
          <div className="adm-panel">
            <div className="adm-panel-header">
              <div>
                <h2 className="adm-panel-title">Revenue Distribution</h2>
                <p className="adm-panel-sub">Breakdown by category</p>
              </div>
            </div>
            <div className="adm:p-4">
              <RevenuePieChart
                data={{
                  totalRevenue: stats.totalRevenue,
                  refundedAmount: stats.refundedAmount,
                  failedAmount: stats.failedAmount,
                  netRevenue: stats.totalRevenue - stats.refundedAmount,
                }}
              />
            </div>
          </div>

          {/* Bar Chart Card */}
          <div className="adm-panel">
            <div className="adm-panel-header">
              <div>
                <h2 className="adm-panel-title">Revenue by Provider</h2>
                <p className="adm-panel-sub">Top 10 providers</p>
              </div>
            </div>
            <div className="adm:p-4">
              <ProviderBarChart providers={filteredAndSortedProviders} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
