'use client'

import { ChevronDown, Filter, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAdminStore, OrderStatus, ProviderStatus } from '../stores/useAdminStore'

interface FilterOption<T = string> {
  label: string
  value: T
  count?: number
}

interface StatusFilterProps {
  options: FilterOption[]
  value: string | null
  onChange: (value: string | null) => void
  _placeholder?: string
  allLabel?: string
}

function StatusFilter({
  options,
  value,
  onChange,
  _placeholder = 'Filter by status',
  allLabel = 'All statuses',
}: StatusFilterProps) {
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

  const selectedLabel = value
    ? options.find((opt) => opt.value === value)?.label || value
    : allLabel

  return (
    <div ref={containerRef} className="adm:relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="adm:flex adm:items-center adm:gap-2 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:border adm:border-border adm:bg-surface adm:text-text hover:adm:bg-surface-hover adm:transition-colors"
        type="button"
      >
        <Filter className="adm:w-4 adm:h-4 adm:text-muted" />
        <span className="adm:hidden sm:adm:inline">{selectedLabel}</span>
        <ChevronDown
          className={`adm:w-4 adm:h-4 adm:text-muted adm:transition-transform ${isOpen ? 'adm:rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="adm:absolute adm:top-full adm:mt-2 adm:left-0 adm:z-50 adm:min-w-[180px] adm:rounded-lg adm:bg-surface adm:shadow-lg adm:shadow-black/20 adm:overflow-hidden">
          <button
            onClick={() => {
              onChange(null)
              setIsOpen(false)
            }}
            className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:transition-colors ${
              !value
                ? 'adm:bg-accent-dim adm:text-accent adm:font-medium'
                : 'adm:text-text hover:adm:bg-surface-hover'
            }`}
          >
            {allLabel}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:flex adm:items-center adm:justify-between adm:transition-colors ${
                value === option.value
                  ? 'adm:bg-accent-dim adm:text-accent adm:font-medium'
                  : 'adm:text-text hover:adm:bg-surface-hover'
              }`}
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className="adm:text-xs adm:text-muted adm:bg-overlay-sm adm:px-2 adm:py-0.5 adm:rounded-full">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SortFilterProps {
  value: string
  onChange: (value: string) => void
}

const sortOptions: FilterOption[] = [
  { label: 'Newest first', value: 'date-desc' },
  { label: 'Oldest first', value: 'date-asc' },
  { label: 'Amount: High to low', value: 'amount-desc' },
  { label: 'Amount: Low to high', value: 'amount-asc' },
  { label: 'Name: A to Z', value: 'name-asc' },
  { label: 'Name: Z to A', value: 'name-desc' },
]

function SortFilter({ value, onChange }: SortFilterProps) {
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
        className="adm:flex adm:items-center adm:gap-2 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:border adm:border-border adm:bg-surface adm:text-text hover:adm:bg-surface-hover adm:transition-colors"
        type="button"
      >
        <span className="adm:hidden sm:adm:inline">{selectedLabel}</span>
        <span className="adm:inline sm:adm:hidden">Sort</span>
        <ChevronDown
          className={`adm:w-4 adm:h-4 adm:text-muted adm:transition-transform ${isOpen ? 'adm:rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="adm:absolute adm:top-full adm:right-0 adm:mt-2 adm:z-50 adm:min-w-[180px] adm:rounded-lg adm:bg-surface adm:shadow-lg adm:shadow-black/20 adm:overflow-hidden">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`adm:w-full adm:px-3 adm:py-2 adm:text-left adm:text-sm adm:transition-colors ${
                value === option.value
                  ? 'adm:bg-accent-dim adm:text-accent adm:font-medium'
                  : 'adm:text-text hover:adm:bg-surface-hover'
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

interface FilterBarProps {
  type: 'orders' | 'providers' | 'disputes'
  totalCount?: number
  filteredCount?: number
  inline?: boolean
}

const orderStatusOptions: FilterOption<OrderStatus>[] = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Processing', value: 'Processing' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
]

const providerStatusOptions: FilterOption<ProviderStatus>[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

export function FilterBar({ type, totalCount, filteredCount, inline }: FilterBarProps) {
  const {
    orderStatus,
    providerStatus,
    sortBy,
    setOrderStatus,
    setProviderStatus,
    setSortBy,
    clearFilters,
  } = useAdminStore()

  const hasFilters = orderStatus !== null || providerStatus !== null

  return (
    <div className={`adm:flex adm:items-center adm:gap-2 ${inline ? '' : 'adm:mb-4'}`}>
      {/* Status filters */}
      {type === 'orders' && (
        <StatusFilter
          options={orderStatusOptions}
          value={orderStatus}
          onChange={(val) => setOrderStatus(val as OrderStatus | null)}
          _placeholder="Status"
          allLabel="All statuses"
        />
      )}

      {type === 'providers' && (
        <StatusFilter
          options={providerStatusOptions}
          value={providerStatus}
          onChange={(val) => setProviderStatus(val as ProviderStatus | null)}
          _placeholder="Status"
          allLabel="All statuses"
        />
      )}

      {/* Sort filter */}
      <SortFilter value={sortBy} onChange={setSortBy} />

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="adm:flex adm:items-center adm:gap-1.5 adm:px-3 adm:py-2.5 adm:text-sm adm:font-medium adm:rounded-lg adm:text-muted hover:adm:text-text hover:adm:bg-surface-hover adm:transition-colors"
          type="button"
        >
          <X className="adm:w-4 adm:h-4" />
          <span className="adm:hidden sm:adm:inline">Clear filters</span>
        </button>
      )}

      {/* Results count */}
      {!inline && filteredCount !== undefined && (
        <p className="adm:text-sm adm:text-muted adm:ml-auto">
          Showing <span className="adm:font-semibold adm:text-text">{filteredCount}</span> of{' '}
          <span className="adm:font-semibold adm:text-text">{totalCount}</span> results
        </p>
      )}
    </div>
  )
}

export { StatusFilter, SortFilter }
