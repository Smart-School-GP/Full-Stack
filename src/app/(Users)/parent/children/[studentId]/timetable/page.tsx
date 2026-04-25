'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import api from '@/lib/api'

const WeeklyTimetable = dynamic(() => import('@/components/timetable/WeeklyTimetable'), { ssr: false })

export default function ParentChildTimetablePage() {
  const { studentId } = useParams<{ studentId: string }>()
  const [slots, setSlots] = useState([])
  const [events, setEvents] = useState([])
  const [studentName, setStudentName] = useState('')
  const [today, setToday] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/api/timetable/student/${studentId}`).catch(() => []),
      api.get('/api/events'),
    ]).then(([tRes, evRes]) => {
      setSlots(tRes.slots || tRes || [])
      setStudentName(tRes.studentName || '')
      setEvents(evRes)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [studentId])

  if (loading) return (
    <div className="page-container">
      <div className="h-96 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
    </div>
  )

  return (
    <div className="page-container">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/parent/dashboard" className="hover:text-brand-600">Dashboard</Link>
          <span>›</span>
          <span className="text-slate-600 dark:text-slate-300">{studentName}'s Timetable</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {studentName ? `${studentName}'s Timetable` : 'Student Timetable'}
        </h1>
      </div>

      <div className="card">
        <WeeklyTimetable slots={slots} events={events} />
      </div>
    </div>
  )
}
