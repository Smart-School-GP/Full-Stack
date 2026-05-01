'use client'

import { useEffect, useRef, useState } from 'react'

interface DateTimePickerProps {
  value: string           // "YYYY-MM-DDTHH:mm"
  onChange: (val: string) => void
  min?: string            // "YYYY-MM-DDTHH:mm"
  required?: boolean
  className?: string
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseValue(value: string): { date: Date | null; time: string } {
  if (!value) return { date: null, time: '09:00' }
  const [datePart, timePart] = value.split('T')
  const d = new Date(datePart + 'T00:00:00')
  return { date: isNaN(d.getTime()) ? null : d, time: timePart || '09:00' }
}

export default function DateTimePicker({ value, onChange, min, required, className }: DateTimePickerProps) {
  const { date: initDate, time: initTime } = parseValue(value)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState((initDate || new Date()).getFullYear())
  const [viewMonth, setViewMonth] = useState((initDate || new Date()).getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(initDate)
  const [time, setTime] = useState(initTime)
  const ref = useRef<HTMLDivElement>(null)

  // Sync external value changes
  useEffect(() => {
    const { date, time: t } = parseValue(value)
    setSelectedDate(date)
    setTime(t)
    if (date) { setViewYear(date.getFullYear()); setViewMonth(date.getMonth()) }
  }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const minDate = min ? new Date(min.split('T')[0] + 'T00:00:00') : null

  function selectDate(d: Date) {
    // Manual date pick — stay open so user can adjust time, then click Done
    setSelectedDate(d)
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    onChange(`${dateStr}T${time}`)
  }

  function handleTimeChange(t: string) {
    setTime(t)
    if (selectedDate) {
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`
      onChange(`${dateStr}T${t}`)
    }
  }

  function handleToday() {
    // Today shortcut — set date AND close immediately
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setSelectedDate(today)
    setOpen(false)
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    onChange(`${dateStr}T${time}`)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function isDisabled(day: number) {
    if (!minDate) return false
    const d = new Date(viewYear, viewMonth, day)
    return d < minDate
  }

  function isSelected(day: number) {
    if (!selectedDate) return false
    return selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day
  }

  function isToday(day: number) {
    const now = new Date()
    return now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day
  }

  const displayValue = value
    ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input w-full text-left flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={displayValue ? 'text-slate-800 dark:text-white' : 'text-slate-400'}>
          {displayValue || 'Pick date & time…'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-72 p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-slate-800 dark:text-white text-sm">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <span key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    disabled={isDisabled(day)}
                    onClick={() => selectDate(new Date(viewYear, viewMonth, day))}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-all
                      ${isSelected(day) ? 'bg-brand-600 text-white shadow' : ''}
                      ${isToday(day) && !isSelected(day) ? 'ring-2 ring-brand-400 text-brand-600 dark:text-brand-400' : ''}
                      ${!isSelected(day) && !isDisabled(day) ? 'hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-700 dark:text-slate-200' : ''}
                      ${isDisabled(day) ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={handleToday}
            className="w-full mt-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
          >
            Today
          </button>

          {/* Time picker */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <input
              type="time"
              value={time}
              onChange={e => handleTimeChange(e.target.value)}
              className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Done button — only show after a date is manually selected */}
          {selectedDate && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full mt-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Hidden native input for form validation */}
      {required && <input type="text" required value={value} onChange={() => {}} className="sr-only" tabIndex={-1} />}
    </div>
  )
}
