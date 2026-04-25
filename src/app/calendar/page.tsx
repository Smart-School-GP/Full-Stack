'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import EventCalendar from '@/components/timetable/EventCalendar'

interface SchoolEvent {
  id: string
  title: string
  eventType: string
  start: string
  end: string
  color?: string
  description?: string
}

const TYPE_COLORS: Record<string, string> = {
  holiday: '#10b981',
  exam: '#ef4444',
  event: '#6366f1',
  deadline: '#f59e0b',
  other: '#64748b',
}

export default function SchoolCalendarPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [selected, setSelected] = useState<SchoolEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/events')
      .then((r) => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color || TYPE_COLORS[e.eventType] || '#6366f1',
    borderColor: e.color || TYPE_COLORS[e.eventType] || '#6366f1',
    allDay: true,
  }))

  const handleEventClick = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId)
    if (ev) setSelected(ev)
  }

  return (
    <div className="page-container max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">School Calendar</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Holidays, exams, and events</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
        ) : (
          <EventCalendar events={calendarEvents} onEventClick={handleEventClick} />
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div
                className="text-xs px-2 py-0.5 rounded-full font-medium text-white capitalize"
                style={{ backgroundColor: selected.color || TYPE_COLORS[selected.eventType] || '#6366f1' }}
              >
                {selected.eventType}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-lg mb-2">{selected.title}</h3>
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
              <p>📅 {new Date(selected.start).toLocaleDateString()} – {new Date(selected.end).toLocaleDateString()}</p>
              {selected.description && <p>{selected.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
