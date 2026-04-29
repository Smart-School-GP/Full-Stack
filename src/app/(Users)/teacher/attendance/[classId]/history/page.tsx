'use client'

import { useEffect, useState, useMemo } from 'react'
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
  const { classId } = useParams()
  const roomId = Array.isArray(classId) ? classId[0] : classId
  const router = useRouter()
  
  const [students, setStudents] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentsRes, recordsRes, roomRes] = await Promise.all([
        api.get(`/api/teacher/rooms/${roomId}/students`),
        api.get(`/api/attendance/room/${roomId}`, { params: { from: dateFrom, to: dateTo } }),
        api.get('/api/teacher/rooms'),
      ])
      
      setStudents(studentsRes.data || [])
      setRecords(recordsRes.data || [])
      
      const cls = roomRes.data?.find((c: any) => c.id === roomId)
      if (cls) setClassName(cls.name)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error?.message || 'Failed to load attendance history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (roomId) loadData()
  }, [roomId, dateFrom, dateTo])

  // Get unique sorted dates from records
  const dates = useMemo(() => {
    return [...new Set(records.map((r) => r.date?.split('T')[0]))].sort()
  }, [records])

  // Build per-student lookup
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, any>> = {}
    records.forEach((r) => {
      const date = r.date?.split('T')[0]
      const studentId = r.studentId
      if (!map[studentId]) map[studentId] = {}
      map[studentId][date] = { status: r.status, markedBy: r.markedByUser?.name }
    })
    return map
  }, [records])

  // Stats per student
  const studentStats = useMemo(() => {
    return students.map((s) => {
      const studentRecords = records.filter((r) => r.studentId === s.id)
      const total = studentRecords.length
      const present = studentRecords.filter((r) => r.status === 'present').length
      const late = studentRecords.filter((r) => r.status === 'late').length
      const absent = studentRecords.filter((r) => r.status === 'absent').length
      const rate = total > 0 ? ((present + late) / total) * 100 : null
      return { ...s, total, present, late, absent, rate }
    })
  }, [students, records])

  // Global Summary Stats
  const globalSummary = useMemo(() => {
    if (records.length === 0) return null
    const present = records.filter(r => r.status === 'present').length
    const late = records.filter(r => r.status === 'late').length
    const absent = records.filter(r => r.status === 'absent').length
    const excused = records.filter(r => r.status === 'excused').length
    const avgRate = studentStats.reduce((acc, s) => acc + (s.rate || 0), 0) / (studentStats.filter(s => s.rate !== null).length || 1)
    
    return { present, late, absent, excused, avgRate, total: records.length }
  }, [records, studentStats])

  const exportHeaders = ['Student', ...dates, 'Present', 'Late', 'Absent', 'Rate']
  const exportRows = studentStats.map((s) => [
    s.name,
    ...dates.map((d) => lookup[s.id]?.[d]?.status || '-'),
    s.present,
    s.late,
    s.absent,
    s.rate !== null ? `${s.rate.toFixed(0)}%` : 'N/A',
  ])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/teacher/attendance/${roomId}`)}
              className="p-2.5 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {className || 'Attendance History'}
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Historical performance grid</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadData}
              className="p-2.5 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
              title="Refresh data"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <ExportButtons
              title={`Attendance History - ${className}`}
              headers={exportHeaders}
              rows={exportRows}
              filename={`attendance_history_${className}`}
            />
          </div>
        </div>

        {/* Summary Dashboard */}
        {globalSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 bg-white dark:bg-slate-800 border-none shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-brand-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Rate</p>
              <h3 className={`text-2xl font-black ${globalSummary.avgRate >= 90 ? 'text-emerald-600' : globalSummary.avgRate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                {globalSummary.avgRate.toFixed(1)}%
              </h3>
            </div>
            <div className="card p-4 bg-white dark:bg-slate-800 border-none shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Records</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{globalSummary.total}</h3>
            </div>
            <div className="card p-4 bg-white dark:bg-slate-800 border-none shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Present/Late</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-emerald-600">{globalSummary.present}</h3>
                <span className="text-slate-400 text-xs">/</span>
                <h3 className="text-xl font-bold text-amber-600">{globalSummary.late}</h3>
              </div>
            </div>
            <div className="card p-4 bg-white dark:bg-slate-800 border-none shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Absences</p>
              <h3 className="text-2xl font-black text-red-600">{globalSummary.absent}</h3>
            </div>
          </div>
        )}

        {/* Date filters & Legend */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm mb-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-wrap gap-6 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="lg:ml-auto flex flex-wrap gap-4">
            {Object.entries({ P: 'present', A: 'absent', L: 'late', E: 'excused' }).map(([label, status]) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                    {label}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    {status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-700 dark:text-red-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
            <button onClick={loadData} className="ml-auto text-xs font-bold uppercase tracking-widest hover:underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-medium animate-pulse">Syncing history data...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-slate-400 font-bold uppercase tracking-widest">No students enrolled in this room.</p>
          </div>
        ) : dates.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-slate-400 font-bold uppercase tracking-widest">No attendance records found for this period.</p>
            <p className="text-xs text-slate-500 mt-2">Try adjusting the date filters above.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px] sticky left-0 bg-slate-50/50 dark:bg-slate-900/50 z-20 min-w-[180px] backdrop-blur-md">
                      Student Name
                    </th>
                    {dates.map((date) => (
                      <th key={date} className="px-3 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center min-w-[64px]">
                        <div>{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div className="text-lg text-slate-700 dark:text-slate-300 -mt-1">{new Date(date + 'T12:00:00').getDate()}</div>
                      </th>
                    ))}
                    <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center min-w-[80px] bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {studentStats.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-10 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-900/50">
                        <div className="truncate max-w-[160px]">{student.name}</div>
                      </td>
                      {dates.map((date) => {
                        const cell = lookup[student.id]?.[date]
                        const cfg = cell ? STATUS_CONFIG[cell.status] : null
                        return (
                          <td key={date} className="px-3 py-4 text-center">
                            {cfg ? (
                              <div 
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black shadow-sm ${cfg.bg} ${cfg.color}`}
                                title={cell.markedBy ? `Marked by: ${cell.markedBy}` : ''}
                              >
                                {cfg.label}
                              </div>
                            ) : (
                              <span className="text-slate-200 dark:text-slate-700 font-black">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-6 py-4 text-center">
                        {student.rate !== null ? (
                          <div className="flex flex-col items-center">
                            <span className={`text-sm font-black ${
                              student.rate >= 90
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : student.rate >= 75
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {student.rate.toFixed(0)}%
                            </span>
                            <div className="w-12 h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  student.rate >= 90 ? 'bg-emerald-500' : student.rate >= 75 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${student.rate}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
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
