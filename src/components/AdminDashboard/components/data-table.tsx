'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize: 8 } },
  })

  return (
    <div className="adm:w-full">
      {/* Table */}
      <div className="adm:rounded-xl adm:border adm:border-(--adm-border) adm:overflow-hidden">
        <table className="adm:w-full adm:text-sm">
          <thead className="adm:bg-(--adm-overlay-sm) adm:border-b adm:border-(--adm-border)">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="adm:px-4 adm:py-3 adm:text-left adm:font-semibold adm:text-(--adm-muted) adm:uppercase adm:tracking-widest adm:text-xs"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div className="adm:flex adm:items-center adm:gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="adm:text-(--adm-muted)/50">
                          {header.column.getIsSorted() === 'asc'
                            ? ' ↑'
                            : header.column.getIsSorted() === 'desc'
                              ? ' ↓'
                              : ' ↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="adm:bg-(--adm-surface) adm:divide-y adm:divide-(--adm-border)">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:adm:bg-(--adm-surface-hover) adm:transition-colors adm:duration-150"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="adm:px-4 adm:py-3 adm:text-(--adm-text)">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="adm:px-4 adm:py-10 adm:text-center adm:text-(--adm-muted)"
                >
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="adm:flex adm:items-center adm:justify-between adm:mt-4">
        <p className="adm:text-xs adm:text-(--adm-muted)">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="adm:flex adm:gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="adm:px-3 adm:py-1.5 adm:text-xs adm:font-semibold adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) disabled:adm:opacity-40 disabled:adm:cursor-not-allowed adm:transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="adm:px-3 adm:py-1.5 adm:text-xs adm:font-semibold adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) disabled:adm:opacity-40 disabled:adm:cursor-not-allowed adm:transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
