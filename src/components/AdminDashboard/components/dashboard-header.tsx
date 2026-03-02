'use client'

import { AdminDatePicker } from './admin-date-picker'
import { SearchInput } from './search-input'
import { DownloadButton } from './download-button'

export function DashboardHeader() {
  return (
    <header className="adm:flex adm:flex-col adm:gap-4 adm:pb-6 adm:border-b adm:border-[var(--adm-border)]">
      <div className="adm:flex adm:items-end adm:justify-between">
        <div className="adm:flex adm:flex-col adm:gap-1">
          <h2 className="adm:text-[2rem] adm:font-bold adm:leading-none adm:tracking-[-0.04em] adm:m-0 adm:text-[var(--adm-text)]">
            Dashboard
          </h2>
        </div>
        <div className="adm:flex adm:items-center adm:gap-3">
          <div className="adm:w-64">
            <SearchInput placeholder="Search orders across dashboard..." />
          </div>
          <AdminDatePicker />
          <DownloadButton />
        </div>
      </div>
    </header>
  )
}
