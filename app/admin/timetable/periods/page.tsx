'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import PeriodManager from '@/components/timetable/PeriodManager'

export default function AdminPeriodsPage() {
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPeriods = () => {
    api.get('/api/timetable/periods')
      .then((r) => setPeriods(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPeriods() }, [])

  const handleSave = async (data: any) => {
    if (data.id) {
      await api.put(`/api/timetable/periods/${data.id}`, data)
    } else {
      await api.post('/api/timetable/periods', data)
    }
    fetchPeriods()
  }

  const handleDelete = async (id: string) => {
    await api.delete(`/api/timetable/periods/${id}`)
    fetchPeriods()
  }

  return (
    <div className="page-container max-w-2xl">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href="/admin/timetable" className="hover:text-brand-600">Timetable</Link>
        <span>›</span>
        <span className="text-slate-600 dark:text-slate-300">Bell Schedule</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 card animate-pulse bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : (
        <PeriodManager
          periods={periods}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
