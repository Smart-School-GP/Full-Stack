'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: 'Present', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  absent: { label: 'Absent', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
  late: { label: 'Late', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  excused: { label: 'Excused', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
}

export default function ParentAttendancePage() {
  const router = useRouter()
  const [children, setChildren] = useState<any[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  useEffect(() => {
    api.get('/api/parent/children')
      .then((res) => {
        setChildren(res.data)
        if (res.data.length > 0) setSelectedChildId(res.data[0].id)
      })
      .catch(console.error)
      .finally(() => setLoadingChildren(false))
  }, [])

  useEffect(() => {
    if (selectedChildId) loadAttendance(selectedChildId)
  }, [selectedChildId])

  const loadAttendance = async (studentId: string) => {
    setLoadingAttendance(true)
    try {
      const res = await api.get(`/api/attendance/student/${studentId}`)
      setAttendanceData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAttendance(false)
    }
  }

  const selectedChild = children.find((c) => c.id === selectedChildId)
  const summary = attendanceData?.summary
  const records: any[] = attendanceData?.records || []

  const attendanceRate = summary?.rate ?? 0
  const rateColor = attendanceRate >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : attendanceRate >= 60
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  // Group by month
  const grouped: Record<string, any[]> = {}
  records.forEach((r) => {
    const month = new Date(r.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(r)
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/parent/dashboard')}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track your child's attendance</p>
          </div>
        </div>

        {/* Child Selector */}
        {!loadingChildren && children.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedChildId === child.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {loadingChildren ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : children.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">No children linked to your account.</div>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && !loadingAttendance && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="card text-center py-4">
                  <p className={`text-2xl font-bold ${rateColor}`}>{attendanceRate.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Rate</p>
                </div>
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.present}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Present</p>
                </div>
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.absent}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Absent</p>
                </div>
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.late}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Late</p>
                </div>
              </div>
            )}

            {/* Attendance warning */}
            {summary && attendanceRate < 80 && !loadingAttendance && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {selectedChild?.name}'s attendance is below 80%
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Please ensure regular attendance to avoid academic impact.
                  </p>
                </div>
              </div>
            )}

            {/* Records */}
            {loadingAttendance ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">No attendance records yet.</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([month, recs]) => (
                  <div key={month}>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      {month}
                    </h3>
                    <div className="card p-0 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                      {recs.map((record) => {
                        const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.present
                        return (
                          <div key={record.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-white">
                                {new Date(record.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                              {record.room?.name && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{record.room.name}</p>
                              )}
                              {record.note && (
                                <p className="text-xs italic text-slate-500 dark:text-slate-400 mt-0.5">"{record.note}"</p>
                              )}
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
