import { useQuery } from '@tanstack/react-query'
import { useAdminStore, ProviderStatus } from '../stores/useAdminStore'

export interface Provider {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
  lastUsedAt?: string | null
  createdAt: string
}

interface ProvidersQueryOptions {
  searchQuery?: string
  status?: ProviderStatus | null
  sortBy?: string
}

function filterAndSortProviders(providers: Provider[], options: ProvidersQueryOptions): Provider[] {
  let result = [...providers]

  // Filter by search query
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase()
    result = result.filter(
      (provider) =>
        provider.name.toLowerCase().includes(query) || provider.slug.toLowerCase().includes(query),
    )
  }

  // Filter by status
  if (options.status) {
    result = result.filter((provider) => provider.status === options.status)
  }

  // Sort
  if (options.sortBy) {
    result.sort((a, b) => {
      switch (options.sortBy) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })
  }

  return result
}

export function useProvidersQuery() {
  const searchQuery = useAdminStore((state) => state.searchQuery)
  const providerStatus = useAdminStore((state) => state.providerStatus)
  const sortBy = useAdminStore((state) => state.sortBy)

  return useQuery({
    queryKey: ['providers', { searchQuery, providerStatus, sortBy }],
    queryFn: async (): Promise<Provider[]> => {
      const response = await fetch('/api/admin/providers')

      if (!response.ok) {
        throw new Error('Failed to fetch providers')
      }

      const data = await response.json()

      return filterAndSortProviders(data, {
        searchQuery,
        status: providerStatus,
        sortBy,
      })
    },
  })
}

export function useProvidersCount() {
  const { data: providers } = useProvidersQuery()
  return { total: providers?.length || 0 }
}
