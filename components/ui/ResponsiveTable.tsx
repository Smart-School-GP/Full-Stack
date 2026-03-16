'use client'

import React from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  emptyMessage?: string
}

export function ResponsiveTable<T>({ 
  columns, 
  data, 
  keyField, 
  emptyMessage = 'No data available' 
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={String(item[keyField])}>
                {columns.map((col) => (
                  <td key={`${String(item[keyField])}-${col.key}`} className={col.className}>
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={String(item[keyField])}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm"
          >
            {columns.map((col, idx) => (
              <div key={`${String(item[keyField])}-${col.key}`} className={idx !== 0 ? 'mt-2' : ''}>
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                  {col.header}
                </span>
                <div className="text-slate-900 dark:text-slate-100 mt-0.5">
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
