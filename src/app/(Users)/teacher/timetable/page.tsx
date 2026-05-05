'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import api from '@/lib/api'

const WeeklyTimetable = dynamic(() => import('@/components/timetable/WeeklyTimetable'), { ssr: false })

export default function TeacherTimetablePage() {
  const [slots, setSlots] = useState([])
  const [events, setEvents] = useState([])
  const [today, setToday] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/timetable/my'),
      api.get('/api/timetable/today'),
      api.get('/api/events'),
    ]).then(([tRes, todayRes, evRes]: any) => {
      const flatten = (s: any) => ({
        ...s,
        startTime: s.startTime || s.period?.startTime,
        endTime: s.endTime || s.period?.endTime,
        subject: s.subject || s.curriculumSubject,
        roomName: s.room?.name || s.room
      })

      const slotsRaw = tRes.data?.data ?? tRes.data ?? []
      const todayRaw = todayRes.data?.data ?? todayRes.data ?? []
      const eventsRaw = evRes.data?.data ?? evRes.data ?? []

      setSlots(slotsRaw.map(flatten))
      setToday(todayRaw.map(flatten))
      setEvents(eventsRaw)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-container">
      <div className="h-96 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
    </div>
  )

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">My Teaching Schedule</h1>

      {Array.isArray(today) && today.length > 0 && (
        <div className="card mb-6 bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800">
          <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-400 mb-3">Today's Rooms</h2>
          <div className="flex flex-wrap gap-2">
            {today.map((slot: any) => (
              <div key={slot.id} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                <span className="text-brand-600 dark:text-brand-400 font-medium">{slot.startTime}–{slot.endTime}</span>
                <span className="text-slate-700 dark:text-slate-300">{slot.subject?.name}</span>
                <span className="text-slate-400 text-xs">{slot.roomName || ''}</span>
                {slot.roomName && <span className="text-slate-400 text-xs ml-1">📍</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <WeeklyTimetable slots={slots} events={events} />
      </div>
    </div>
  )
}
