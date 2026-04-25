'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import ExportButtons from '@/components/ui/ExportButtons'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: 'P', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  absent: { label: 'A', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
  late: { label: 'L', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  excused: { label: 'E', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
}

export default function AttendanceHistoryPage() {
  const { roomId } = useParams()
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (roomId) loadData()
  }, [roomId, dateFrom, dateTo])

  const loadData = async () => {
    setLoading(true)
    try {
      const [studentsRes, recordsRes, roomRes] = await Promise.all([
        api.get(`/api/teacher/rooms/${roomId}/students`),
        api.get(`/api/attendance/room/${roomId}`, { params: { from: dateFrom, to: dateTo } }),
        api.get('/api/teacher/rooms'),
      ])
      setStudents(studentsRes.data)
      setRecords(recordsRes.data)
      const cls = roomRes.data.find((c: any) => c.id === roomId)
      if (cls) setClassName(cls.name)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Get unique sorted dates
  const dates = [...new Set(records.map((r) => r.date?.split('T')[0]))].sort()

  // Build per-student lookup
  const lookup: Record<string, Record<string, string>> = {}
  records.forEach((r) => {
    const date = r.date?.split('T')[0]
    const studentId = r.studentId
    if (!lookup[studentId]) lookup[studentId] = {}
    lookup[studentId][date] = r.status
  })

  // Stats per student
  const studentStats = students.map((s) => {
    const studentRecords = records.filter((r) => r.studentId === s.id)
    const total = studentRecords.length
    const present = studentRecords.filter((r) => r.status === 'present').length
    const absent = studentRecords.filter((r) => r.status === 'absent').length
    const rate = total > 0 ? ((present) / total) * 100 : null
    return { ...s, total, present, absent, rate }
  })

  const exportHeaders = ['Student', ...dates, 'Present', 'Absent', 'Rate']
  const exportRows = studentStats.map((s) => [
    s.name,
    ...dates.map((d) => lookup[s.id]?.[d] || '-'),
    s.present,
    s.absent,
    s.rate !== null ? `${s.rate.toFixed(0)}%` : 'N/A',
  ])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/teacher/attendance/${roomId}`)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {className || 'Attendance History'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Historical attendance grid</p>
            </div>
          </div>
          <ExportButtons
            title={`Attendance History - ${className}`}
            headers={exportHeaders}
            rows={exportRows}
            filename={`attendance_history_${className}`}
          />
        </div>

        {/* Date filters */}
        <div className="card mb-6 flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
            {Object.entries({ P: 'present', A: 'absent', L: 'late', E: 'excused' }).map(([label, status]) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <span key={status} className={`flex items-center gap-1`}>
                  <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                    {label}
                  </span>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">No students in this room.</div>
        ) : dates.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">
            No attendance records for the selected period.
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10 min-w-[140px]">
                      Student
                    </th>
                    {dates.map((date) => (
                      <th key={date} className="px-2 py-3 font-medium text-slate-500 dark:text-slate-400 min-w-[52px] text-center">
                        <div className="text-xs">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center min-w-[60px]">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {studentStats.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10">
                        <div className="truncate max-w-[130px]">{student.name}</div>
                      </td>
                      {dates.map((date) => {
                        const status = lookup[student.id]?.[date]
                        const cfg = status ? STATUS_CONFIG[status] : null
                        return (
                          <td key={date} className="px-2 py-3 text-center">
                            {cfg ? (
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            ) : (
                              <span className="text-slate-200 dark:text-slate-700">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-3 py-3 text-center">
                        {student.rate !== null ? (
                          <span className={`text-sm font-semibold ${
                            student.rate >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : student.rate >= 60
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {student.rate.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
