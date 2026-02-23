import { create } from 'zustand'

export interface DateRange {
  from?: Date
  to?: Date
}

export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled'
export type ProviderStatus = 'active' | 'inactive'

export interface AdminState {
  selectedTab: string
  dateRange: DateRange | null
  searchQuery: string
  orderStatus: OrderStatus | null
  providerStatus: ProviderStatus | null
  sortBy: string
  revenueProviderFilter: string | null
  revenueServiceFilter: string | null
  revenueStatusFilters: string[]
  setSelectedTab: (tab: string) => void
  setDateRange: (range: DateRange | null) => void
  setSearchQuery: (query: string) => void
  setOrderStatus: (status: OrderStatus | null) => void
  setProviderStatus: (status: ProviderStatus | null) => void
  setSortBy: (sort: string) => void
  setRevenueProviderFilter: (provider: string | null) => void
  setRevenueServiceFilter: (service: string | null) => void
  setRevenueStatusFilters: (statuses: string[]) => void
  clearFilters: () => void
  clearRevenueFilters: () => void
}

export const useAdminStore = create<AdminState>((set) => ({
  selectedTab: 'overview',
  dateRange: null,
  searchQuery: '',
  orderStatus: null,
  providerStatus: null,
  sortBy: 'date-desc',
  revenueProviderFilter: null,
  revenueServiceFilter: null,
  revenueStatusFilters: ['paid'],
  setSelectedTab: (selectedTab) => set({ selectedTab }),
  setDateRange: (dateRange) => set({ dateRange }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setOrderStatus: (orderStatus) => set({ orderStatus }),
  setProviderStatus: (providerStatus) => set({ providerStatus }),
  setSortBy: (sortBy) => set({ sortBy }),
  setRevenueProviderFilter: (revenueProviderFilter) => set({ revenueProviderFilter }),
  setRevenueServiceFilter: (revenueServiceFilter) => set({ revenueServiceFilter }),
  setRevenueStatusFilters: (revenueStatusFilters) => set({ revenueStatusFilters }),
  clearFilters: () =>
    set({
      orderStatus: null,
      providerStatus: null,
      searchQuery: '',
      sortBy: 'date-desc',
      revenueProviderFilter: null,
    }),
  clearRevenueFilters: () =>
    set({
      revenueProviderFilter: null,
      revenueServiceFilter: null,
      revenueStatusFilters: ['paid'],
    }),
}))
