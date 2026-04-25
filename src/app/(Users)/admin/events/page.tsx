'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import EventCalendar from '@/components/timetable/EventCalendar'

interface SchoolEvent {
  id: string
  title: string
  description?: string
  eventType: string
  start: string
  end: string
  color?: string
  creator?: { name: string }
}

const EVENT_TYPES = ['holiday', 'exam', 'event', 'deadline', 'other']
const TYPE_COLORS: Record<string, string> = {
  holiday: '#10b981',
  exam: '#ef4444',
  event: '#6366f1',
  deadline: '#f59e0b',
  other: '#64748b',
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'event',
    start_date: '',
    end_date: '',
    color: '#6366f1',
  })

  const fetchEvents = () => {
    api.get('/api/events')
      .then((r) => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [])

  const openCreate = () => {
    setEditingEvent(null)
    const today = new Date().toISOString().slice(0, 16)
    setForm({ title: '', description: '', eventType: 'event', start_date: today, end_date: today, color: '#6366f1' })
    setShowForm(true)
  }

  const openEdit = (event: SchoolEvent) => {
    setEditingEvent(event)
    setForm({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType,
      start_date: new Date(event.start).toISOString().slice(0, 16),
      end_date: new Date(event.end).toISOString().slice(0, 16),
      color: event.color || '#6366f1',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (editingEvent) {
        await api.put(`/api/events/${editingEvent.id}`, form)
      } else {
        await api.post('/api/events', form)
      }
      setShowForm(false)
      fetchEvents()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return
    await api.delete(`/api/events/${id}`)
    fetchEvents()
  }

  const handleEventClick = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId)
    if (ev) openEdit(ev)
  }

  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color || TYPE_COLORS[e.eventType] || '#6366f1',
    borderColor: e.color || TYPE_COLORS[e.eventType] || '#6366f1',
    allDay: true,
  }))

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">School Events & Holidays</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{events.length} events</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Add Event</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card overflow-hidden">
          {loading ? (
            <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ) : (
            <EventCalendar events={calendarEvents} onEventClick={handleEventClick} />
          )}
        </div>

        {/* Event list */}
        <div className="space-y-2 overflow-y-auto max-h-[600px]">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 px-1">All Events</h2>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No events yet</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="card py-2 px-3 flex items-start gap-2">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: e.color || TYPE_COLORS[e.eventType] || '#6366f1' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{e.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(e.start).toLocaleDateString()} · {e.eventType}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(e)} className="text-[10px] text-slate-400 hover:text-brand-600">Edit</button>
                  <button onClick={() => handleDelete(e.id)} className="text-[10px] text-red-400 hover:text-red-600">Del</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              {editingEvent ? 'Edit Event' : 'Add Event'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                className="input"
                placeholder="Event title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <select
                className="input"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value, color: TYPE_COLORS[e.target.value] || form.color })}
              >
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <textarea
                className="input"
                placeholder="Description (optional)"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Start</label>
                  <input type="datetime-local" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">End</label>
                  <input type="datetime-local" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-400">Color:</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                <span className="text-xs text-slate-400">{form.color}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
