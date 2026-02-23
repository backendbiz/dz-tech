'use client'

import { Search, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAdminStore } from '../stores/useAdminStore'

interface SearchInputProps {
  placeholder?: string
}

export function SearchInput({ placeholder = 'Search orders...' }: SearchInputProps) {
  const searchQuery = useAdminStore((state) => state.searchQuery)
  const setSearchQuery = useAdminStore((state) => state.setSearchQuery)
  const [inputValue, setInputValue] = useState(searchQuery)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, setSearchQuery])

  // Sync with store when it changes externally
  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  const handleClear = useCallback(() => {
    setInputValue('')
    setSearchQuery('')
  }, [setSearchQuery])

  return (
    <div className="adm:relative adm:flex adm:items-center">
      <Search className="adm:absolute adm:left-3 adm:top-1/2 adm:-translate-y-1/2 adm:w-4 adm:h-4 adm:text-muted" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="adm:w-full adm:pl-9 adm:pr-8 adm:py-2.5 adm:text-sm adm:rounded-lg adm:border adm:border-border adm:bg-surface adm:text-text adm:placeholder:text-muted/60 focus:adm:border-accent focus:adm:ring-1 focus:adm:ring-accent adm:outline-none adm:transition-all"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="adm:absolute adm:right-2 adm:top-1/2 adm:-translate-y-1/2 adm:p-1 adm:rounded-md adm:text-muted hover:adm:text-text hover:adm:bg-overlay-sm adm:transition-colors"
          type="button"
          aria-label="Clear search"
        >
          <X className="adm:w-3.5 adm:h-3.5" />
        </button>
      )}
    </div>
  )
}
