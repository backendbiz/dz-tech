'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { Settings2, ChevronDown, Eye, EyeOff } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnVisibility },
    initialState: { pagination: { pageSize: 8 } },
  })

  return (
    <div className="adm:w-full">
      {/* Column Visibility Controls */}
      <div className="adm:mb-3 adm:flex adm:items-center adm:justify-between">
        <p className="adm:text-xs adm:text-(--adm-muted)">
          Showing {table.getVisibleFlatColumns().length - 1} of {columns.length} columns
        </p>
        <div className="adm:relative group">
          <button
            type="button"
            className="adm:flex adm:items-center adm:gap-1.5 adm:px-3 adm:py-1.5 adm:text-xs adm:font-medium adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) adm:transition-colors"
          >
            <Settings2 className="adm:w-3.5 adm:h-3.5" />
            Columns
            <ChevronDown className="adm:w-3 adm:h-3" />
          </button>
          <div className="adm:absolute adm:right-0 adm:top-full adm:mt-1 adm:w-48 adm:rounded-lg adm:border adm:border-(--adm-border) adm:bg-(--adm-surface) adm:shadow-lg adm:opacity-0 adm:invisible group-hover:adm:opacity-100 group-hover:adm:visible adm:transition-all adm:z-50">
            <div className="adm:p-2 adm:max-h-64 adm:overflow-y-auto">
              <label className="adm:flex adm:items-center adm:gap-2 adm:px-2 adm:py-1.5 adm:text-xs adm:text-(--adm-muted) adm:font-medium adm:uppercase adm:tracking-wider adm:border-b adm:border-(--adm-border) adm:mb-1">
                Toggle Columns
              </label>
              {table.getAllLeafColumns().map((column) => (
                <label
                  key={column.id}
                  className="adm:flex adm:items-center adm:gap-2 adm:px-2 adm:py-1.5 adm:text-sm adm:text-(--adm-text) hover:adm:bg-(--adm-surface-hover) adm:rounded adm:cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="adm:w-4 adm:h-4 adm:rounded adm:border-(--adm-border) adm:text-(--adm-primary) focus:adm:ring-(--adm-primary)"
                  />
                  <span className="adm:flex-1">
                    {column.columnDef.header?.toString() || column.id}
                  </span>
                  {column.getIsVisible() ? (
                    <Eye className="adm:w-3.5 adm:h-3.5 adm:text-(--adm-muted)" />
                  ) : (
                    <EyeOff className="adm:w-3.5 adm:h-3.5 adm:text-(--adm-muted)/50" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

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
