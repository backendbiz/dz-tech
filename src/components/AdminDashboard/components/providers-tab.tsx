'use client'

import Link from 'next/link'
import { useProvidersQuery, useProvidersCount } from '../queries/useProvidersQuery'
import { SearchInput } from './search-input'
import { FilterBar } from './filter-bar'

const statusStyles = {
  active: 'adm-status-completed',
  inactive: 'adm-status-cancelled',
}

function TableSkeleton() {
  return (
    <div className="adm-table-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="adm-table-skeleton-row">
          <div className="adm-skeleton adm-skeleton-sm" />
          <div className="adm-skeleton adm-skeleton-md" />
          <div className="adm-skeleton adm-skeleton-sm" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  message = 'No providers found matching your criteria.',
}: {
  message?: string
}) {
  return (
    <div className="adm:py-16 adm:text-center">
      <div className="adm:mx-auto adm:w-16 adm:h-16 adm:rounded-full adm:bg-(--adm-overlay-sm) adm:flex adm:items-center adm:justify-center adm:mb-4">
        <svg
          className="adm:w-8 adm:h-8 adm:text-(--adm-muted)"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <p className="adm:text-(--adm-muted) adm:text-base">{message}</p>
    </div>
  )
}

export function ProvidersTab() {
  const { data, isLoading, isError } = useProvidersQuery()
  const { total } = useProvidersCount()

  const activeCount = data?.filter((p) => p.status === 'active').length || 0
  const inactiveCount = data?.filter((p) => p.status === 'inactive').length || 0

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <h2 className="adm-panel-title">Payment Providers</h2>
          <p className="adm-panel-sub">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Link href="/admin/collections/providers" className="adm-view-all">
          Manage Providers
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="adm:flex adm:flex-col adm:gap-3">
        <div className="adm:flex adm:items-center adm:gap-3">
          <div className="adm:flex-1">
            <SearchInput placeholder="Search providers by name or slug..." />
          </div>
          <FilterBar type="providers" totalCount={total} filteredCount={data?.length || 0} inline />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="adm-error">Failed to load providers.</div>
      ) : data?.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="adm-table-wrapper">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Provider Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Last Used</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((provider) => (
                <tr key={provider.id} className="adm-table-row">
                  <td>
                    <span className="adm-table-name">{provider.name}</span>
                  </td>
                  <td className="adm-table-id">{provider.slug}</td>
                  <td>
                    <span className={`adm-status ${statusStyles[provider.status]}`}>
                      {provider.status}
                    </span>
                  </td>
                  <td className="adm-table-date">
                    {provider.lastUsedAt
                      ? new Date(provider.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="adm-table-date">
                    {new Date(provider.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
