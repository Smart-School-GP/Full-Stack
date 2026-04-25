'use client'

import { useState } from 'react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_MAP = [1, 2, 3, 4, 5]

interface Subject { id: string; name: string; code?: string }
interface Teacher { id: string; name: string }
interface Period { id: string; name: string; startTime: string; endTime: string; periodNumber: number; isBreak: boolean }

interface TimetableSlot {
  id: string
  dayOfWeek: number
  periodId?: string
  startTime: string
  endTime: string
  subjectId?: string
  teacherId?: string
  room?: string
  subject?: Subject
  teacher?: Teacher
  color?: string
}

interface TimetableBuilderProps {
  roomId: string
  periods: Period[]
  subjects: Subject[]
  teachers: Teacher[]
  slots: TimetableSlot[]
  onAddSlot: (data: {
    dayOfWeek: number
    periodId?: string
    startTime: string
    endTime: string
    subjectId?: string
    teacherId?: string
    room?: string
    color?: string
  }) => Promise<void>
  onDeleteSlot: (slotId: string) => Promise<void>
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']

export default function TimetableBuilder({
  roomId,
  periods,
  subjects,
  teachers,
  slots,
  onAddSlot,
  onDeleteSlot,
}: TimetableBuilderProps) {
  const [adding, setAdding] = useState<{ dayOfWeek: number; period: Period } | null>(null)
  const [form, setForm] = useState({
    subjectId: '',
    teacherId: '',
    room: '',
    color: COLORS[0],
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getSlot = (dayOfWeek: number, periodId: string) =>
    slots.find((s) => s.dayOfWeek === dayOfWeek && s.periodId === periodId)

  const handleAdd = async () => {
    if (!adding) return
    setSaving(true)
    try {
      await onAddSlot({
        dayOfWeek: adding.dayOfWeek,
        periodId: adding.period.id,
        startTime: adding.period.startTime,
        endTime: adding.period.endTime,
        subjectId: form.subjectId || undefined,
        teacherId: form.teacherId || undefined,
        room: form.room || undefined,
        color: form.color,
      })
      setAdding(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slotId: string) => {
    setDeletingId(slotId)
    try { await onDeleteSlot(slotId) } finally { setDeletingId(null) }
  }

  const nonBreakPeriods = periods.filter((p) => !p.isBreak).sort((a, b) => a.periodNumber - b.periodNumber)
  const breakPeriods = periods.filter((p) => p.isBreak)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs text-slate-500 dark:text-slate-400 w-24">Period</th>
            {DAYS.map((day) => (
              <th key={day} className="p-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[140px]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.sort((a, b) => a.periodNumber - b.periodNumber).map((period) => (
            <tr key={period.id} className={period.isBreak ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''}>
              <td className="p-2 border border-slate-100 dark:border-slate-700">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{period.name}</div>
                <div className="text-[10px] text-slate-400">{period.startTime}–{period.endTime}</div>
              </td>
              {DAY_MAP.map((dayOfWeek) => {
                if (period.isBreak) {
                  return (
                    <td key={dayOfWeek} className="p-1 border border-slate-100 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-amber-500">Break</span>
                    </td>
                  )
                }
                const slot = getSlot(dayOfWeek, period.id)
                return (
                  <td key={dayOfWeek} className="p-1 border border-slate-100 dark:border-slate-700">
                    {slot ? (
                      <div
                        className="rounded-md p-2 text-white text-[11px] group relative"
                        style={{ backgroundColor: slot.color || '#6366f1' }}
                      >
                        <div className="font-semibold truncate">{slot.subject?.name || 'Unknown'}</div>
                        {slot.teacher && <div className="opacity-80 truncate">{slot.teacher.name}</div>}
                        {slot.room && <div className="opacity-70 truncate">📍{slot.room}</div>}
                        <button
                          onClick={() => handleDelete(slot.id)}
                          disabled={deletingId === slot.id}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-white/80 hover:text-white text-[10px] bg-black/20 rounded px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAdding({ dayOfWeek, period })
                          setForm({ subjectId: '', teacherId: '', room: '', color: COLORS[0] })
                        }}
                        className="w-full h-14 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-md text-slate-300 dark:text-slate-600 hover:border-brand-400 hover:text-brand-400 transition-colors text-lg"
                      >
                        +
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {adding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
              Add Slot — {DAYS[adding.dayOfWeek - 1]}
            </h3>
            <p className="text-xs text-slate-400 mb-4">{adding.period.name} · {adding.period.startTime}–{adding.period.endTime}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Subject</label>
                <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                  <option value="">-- Select subject --</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Teacher</label>
                <select className="input" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                  <option value="">-- Select teacher --</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Room (optional)</label>
                <input className="input" placeholder="Room 101" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} disabled={saving || !form.subjectId} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Add Slot'}
              </button>
              <button onClick={() => setAdding(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
