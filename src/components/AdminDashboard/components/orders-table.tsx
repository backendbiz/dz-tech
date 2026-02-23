'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './data-table'
import { useOrdersQuery, Order } from '../queries/useOrdersQuery'

const statusStyles: Record<Order['status'], string> = {
  Completed:
    'adm:bg-emerald-50 adm:text-emerald-700 dark:adm:bg-emerald-950 dark:adm:text-emerald-400',
  Pending: 'adm:bg-yellow-50 adm:text-yellow-700 dark:adm:bg-yellow-950 dark:adm:text-yellow-400',
  Processing: 'adm:bg-blue-50 adm:text-blue-700 dark:adm:bg-blue-950 dark:adm:text-blue-400',
  Cancelled: 'adm:bg-red-50 adm:text-red-700 dark:adm:bg-red-950 dark:adm:text-red-400',
}

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'id',
    header: 'Order ID',
    cell: ({ row }) => (
      <span className="adm:font-mono adm:font-semibold adm:text-xs adm:text-(--adm-muted)">
        {row.getValue('id')}
      </span>
    ),
  },
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => {
      const order = row.original
      return (
        <div>
          <p className="adm:font-semibold adm:text-(--adm-text)">{order.customer}</p>
          <p className="adm:text-xs adm:text-(--adm-muted)">{order.email}</p>
        </div>
      )
    },
  },
  {
    accessorKey: 'product',
    header: 'Product',
    cell: ({ row }) => <span className="adm:font-medium">{row.getValue('product')}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <span className="adm:font-bold">{row.getValue('amount')}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as Order['status']
      return (
        <span
          className={`adm:inline-flex adm:items-center adm:px-2.5 adm:py-0.5 adm:rounded-full adm:text-xs adm:font-semibold ${statusStyles[status]}`}
        >
          {status}
        </span>
      )
    },
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="adm:text-(--adm-muted) adm:text-xs">
        {new Date(row.getValue('date')).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </span>
    ),
  },
]

function TableSkeleton() {
  return (
    <div className="adm:rounded-xl adm:border adm:border-(--adm-border) adm:overflow-hidden adm:animate-pulse">
      <div className="adm:bg-(--adm-overlay-sm) adm:px-4 adm:py-3 adm:flex adm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="adm:h-3 adm:bg-(--adm-overlay-md) adm:rounded adm:w-20" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="adm:px-4 adm:py-4 adm:flex adm:gap-4 adm:border-t adm:border-(--adm-border)"
        >
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="adm:h-4 adm:bg-(--adm-overlay-md) adm:rounded adm:w-24" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function OrdersTable() {
  const { data, isLoading, isError } = useOrdersQuery()

  if (isLoading) return <TableSkeleton />

  if (isError)
    return (
      <div className="adm:rounded-xl adm:border adm:border-(--adm-red-border) adm:bg-(--adm-red-dim) adm:p-6 adm:text-(--adm-red) adm:text-sm adm:font-medium">
        Failed to load orders. Please try again.
      </div>
    )

  return <DataTable columns={columns} data={data ?? []} />
}
