'use client'

export function DashboardHeader() {
  return (
    <header className="adm:flex adm:items-end adm:justify-between adm:pb-6 adm:border-b adm:border-[var(--adm-border)]">
      <div className="adm:flex adm:flex-col adm:gap-1">
        <h2 className="adm:text-[2rem] adm:font-bold adm:leading-none adm:tracking-[-0.04em] adm:m-0 adm:text-[var(--adm-text)]">
          Dashboard
        </h2>
      </div>
      <div className="adm:flex adm:items-center adm:gap-2">
        <button className="adm:inline-flex adm:items-center adm:justify-center adm:gap-2 adm:px-4 adm:py-2 adm:text-sm adm:font-medium adm:rounded-md adm:transition-all adm:cursor-pointer adm:border adm:border-[var(--adm-border)] adm:bg-[var(--adm-surface)] adm:text-[var(--adm-text)] hover:adm:bg-[var(--adm-surface-hover)] hover:adm:border-[var(--adm-border-strong)]">
          Download
        </button>
      </div>
    </header>
  )
}
