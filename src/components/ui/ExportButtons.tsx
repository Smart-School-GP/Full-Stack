'use client'

import { exportToPDF, exportToExcel } from '@/lib/exportService'

interface ExportButtonsProps {
  title: string
  headers: string[]
  rows: (string | number)[][]
  filename: string
  className?: string
}

export default function ExportButtons({ title, headers, rows, filename, className = '' }: ExportButtonsProps) {
  const data = { title, headers, rows, filename }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => exportToPDF(data)}
        className="btn-secondary text-xs flex items-center gap-2 py-1.5"
      >
        <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z"/>
        </svg>
        Export PDF
      </button>
      <button
        onClick={() => exportToExcel(data)}
        className="btn-secondary text-xs flex items-center gap-2 py-1.5"
      >
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        Export Excel
      </button>
    </div>
  )
}
