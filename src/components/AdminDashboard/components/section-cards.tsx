'use client'

import { useQuery } from '@tanstack/react-query'

interface StatCard {
  id: string
  title: string
  value: string
  change: string
  changeValue: number
  description: string
  prefix?: string
}

const mockCards: StatCard[] = [
  {
    id: 'revenue',
    title: 'Total Revenue',
    value: '1,250.00',
    prefix: '$',
    change: '+12.5%',
    changeValue: 12.5,
    description: 'Visitors for the last 6 months',
  },
  {
    id: 'customers',
    title: 'New Customers',
    value: '1,234',
    change: '-20%',
    changeValue: -20,
    description: 'Acquisition needs attention',
  },
  {
    id: 'accounts',
    title: 'Active Accounts',
    value: '45,678',
    change: '+12.5%',
    changeValue: 12.5,
    description: 'Engagement exceeds targets',
  },
  {
    id: 'growth',
    title: 'Growth Rate',
    value: '4.5',
    prefix: '',
    change: '+4.5%',
    changeValue: 4.5,
    description: 'Meets growth projections',
  },
]

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
  const { data, isLoading, isError } = useQuery({
    queryKey: ['section-cards'],
    queryFn: async (): Promise<StatCard[]> => {
      await new Promise((r) => setTimeout(r, 800))
      return mockCards
    },
  })

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
