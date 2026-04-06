'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

interface ClassTimetable {
  classId: string
  className: string
  slots: any[]
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAY_MAP: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }

export default function AdminTimetableOverviewPage() {
  const [classes, setClasses] = useState<ClassTimetable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/timetable/all-classes')
      .then((r) => setClasses(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Timetable Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">All classes schedule</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/timetable/periods" className="btn-secondary text-sm">Bell Schedule</Link>
          <Link href="/admin/timetable/builder" className="btn-primary text-sm">Build Timetable</Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🗓️</p>
          <p className="text-slate-500 dark:text-slate-400">No timetable configured yet</p>
          <Link href="/admin/timetable/builder" className="btn-primary mt-4 text-sm inline-block">Build Timetable</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => {
            const slotsByDay: Record<string, any[]> = {}
            DAYS.forEach((d) => { slotsByDay[d] = [] })
            cls.slots.forEach((s) => {
              const day = DAY_MAP[s.dayOfWeek]
              if (day) slotsByDay[day].push(s)
            })

            return (
              <div key={cls.classId} className="card overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-white">{cls.className}</h3>
                  <Link
                    href={`/admin/timetable/builder?classId=${cls.classId}`}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Edit →
                  </Link>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {DAYS.map((day) => (
                    <div key={day}>
                      <div className="text-[10px] font-medium text-slate-400 text-center mb-1">{day}</div>
                      <div className="space-y-1">
                        {slotsByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((s) => (
                          <div
                            key={s.id}
                            className="text-[10px] p-1 rounded text-white text-center truncate"
                            style={{ backgroundColor: s.color || '#6366f1' }}
                            title={`${s.subject?.name} — ${s.startTime}`}
                          >
                            {s.subject?.name?.substring(0, 8)}
                          </div>
                        ))}
                        {slotsByDay[day].length === 0 && (
                          <div className="h-6 rounded bg-slate-100 dark:bg-slate-700" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
