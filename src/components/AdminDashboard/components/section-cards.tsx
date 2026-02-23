'use client'

import { useSectionCardsQuery, StatCard } from '../queries/useSectionCardsQuery'

function ArrowUpIcon() {
  return (
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
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CardSkeleton() {
  return (
    <div className="adm-card adm-skeleton-card">
      <div className="adm-skeleton adm-skeleton-sm" />
      <div className="adm-skeleton adm-skeleton-lg" />
      <div className="adm-skeleton adm-skeleton-md" />
    </div>
  )
}

function StatCardItem({ card }: { card: StatCard }) {
  const isPositive = card.changeValue > 0

  return (
    <div className="adm-card">
      <div className="adm-card-top">
        <span className="adm-card-title">{card.title}</span>
        <span className={`adm-badge-trend ${isPositive ? 'adm-trend-up' : 'adm-trend-down'}`}>
          {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {card.change}
        </span>
      </div>
      <div className="adm-card-value">
        {card.prefix !== undefined ? card.prefix : ''}
        {card.value}
        {card.id === 'growth' ? '%' : ''}
      </div>
      <div className="adm-card-divider" />
      <p className="adm-card-desc">{card.description}</p>
    </div>
  )
}

export function SectionCards() {
  const { data, isLoading, isError } = useSectionCardsQuery()

  if (isError) {
    return <div className="adm-error">Failed to load stats. Please refresh.</div>
  }

  return (
    <div className="adm-cards-grid">
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        : data?.map((card) => <StatCardItem key={card.id} card={card} />)}
    </div>
  )
}
