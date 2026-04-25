'use client'

import { useState } from 'react'

interface Period {
  id: string
  name: string
  startTime: string
  endTime: string
  periodNumber: number
  isBreak: boolean
}

interface PeriodManagerProps {
  periods: Period[]
  onSave: (data: Omit<Period, 'id'> & { id?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const PRESETS = [
  { name: 'Period 1', startTime: '08:00', endTime: '08:50', isBreak: false },
  { name: 'Period 2', startTime: '08:55', endTime: '09:45', isBreak: false },
  { name: 'Break',   startTime: '09:45', endTime: '10:00', isBreak: true },
  { name: 'Period 3', startTime: '10:00', endTime: '10:50', isBreak: false },
  { name: 'Period 4', startTime: '10:55', endTime: '11:45', isBreak: false },
  { name: 'Lunch',   startTime: '11:45', endTime: '12:30', isBreak: true },
  { name: 'Period 5', startTime: '12:30', endTime: '13:20', isBreak: false },
  { name: 'Period 6', startTime: '13:25', endTime: '14:15', isBreak: false },
  { name: 'Period 7', startTime: '14:20', endTime: '15:10', isBreak: false },
]

const empty = { name: '', startTime: '08:00', endTime: '08:50', isBreak: false, periodNumber: 1 }

export default function PeriodManager({ periods, onSave, onDelete }: PeriodManagerProps) {
  const [editing, setEditing] = useState<(Partial<Period> & { id?: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const sorted = [...periods].sort((a, b) => a.periodNumber - b.periodNumber)

  const handleSave = async () => {
    if (!editing || !editing.name || !editing.startTime || !editing.endTime) return
    setSaving(true)
    try {
      await onSave({
        id: editing.id,
        name: editing.name,
        startTime: editing.startTime,
        endTime: editing.endTime,
        isBreak: editing.isBreak || false,
        periodNumber: editing.periodNumber || sorted.length + 1,
      })
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null) }
  }

  const applyPreset = async () => {
    for (let i = 0; i < PRESETS.length; i++) {
      await onSave({ ...PRESETS[i], periodNumber: i + 1 })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-white">Bell Schedule</h3>
        <div className="flex gap-2">
          {periods.length === 0 && (
            <button onClick={applyPreset} className="btn-secondary text-sm">
              Load Default Schedule
            </button>
          )}
          <button onClick={() => setEditing({ ...empty })} className="btn-primary text-sm">
            + Add Period
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              p.isBreak
                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs flex items-center justify-center font-medium text-slate-600 dark:text-slate-300 flex-shrink-0">
              {p.periodNumber}
            </span>
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-800 dark:text-white">{p.name}</span>
              {p.isBreak && <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400">Break</span>}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {p.startTime} – {p.endTime}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing({ ...p })}
                className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deleting === p.id}
                className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"
              >
                {deleting === p.id ? '…' : '✕'}
              </button>
            </div>
          </div>
        ))}
        {periods.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No periods configured yet</p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              {editing.id ? 'Edit Period' : 'Add Period'}
            </h3>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Period name (e.g. Period 1, Lunch)"
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Start Time</label>
                  <input
                    className="input"
                    type="time"
                    value={editing.startTime || ''}
                    onChange={(e) => setEditing({ ...editing, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">End Time</label>
                  <input
                    className="input"
                    type="time"
                    value={editing.endTime || ''}
                    onChange={(e) => setEditing({ ...editing, endTime: e.target.value })}
                  />
                </div>
              </div>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="Period number"
                value={editing.periodNumber || ''}
                onChange={(e) => setEditing({ ...editing, periodNumber: parseInt(e.target.value) })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={editing.isBreak || false}
                  onChange={(e) => setEditing({ ...editing, isBreak: e.target.checked })}
                  className="rounded"
                />
                This is a break/lunch period
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
