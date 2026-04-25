'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import api from '@/lib/api'

const WeeklyTimetable = dynamic(() => import('@/components/timetable/WeeklyTimetable'), { ssr: false })

export default function StudentTimetablePage() {
  const [slots, setSlots] = useState([])
  const [events, setEvents] = useState([])
  const [today, setToday] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/timetable/my'),
      api.get('/api/timetable/today'),
      api.get('/api/events'),
    ]).then(([tRes, todayRes, evRes]) => {
      setSlots(tRes)
      setToday(todayRes)
      setEvents(evRes)
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
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">My Timetable</h1>

      {today.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            <h2 className="text-sm font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Happening Today</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {today.map((slot: any) => (
              <div key={slot.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-brand-100 dark:border-brand-900/30 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex flex-col items-center justify-center text-brand-600 dark:text-brand-400">
                  <span className="text-[10px] font-black uppercase leading-none">{slot.startTime.split(':')[0]}</span>
                  <span className="text-xs font-bold">{slot.startTime.split(':')[1]}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">{slot.subject?.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">{slot.startTime} – {slot.endTime}</span>
                    {slot.room && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">📍 {slot.room}</span>}
                  </div>
                </div>
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
