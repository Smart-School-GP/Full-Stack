'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import ExportButtons from '@/components/ui/ExportButtons'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: 'Present', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  absent: { label: 'Absent', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
  late: { label: 'Late', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  excused: { label: 'Excused', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
}

export default function AdminAttendancePage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [records, setRecords] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    api.get('/api/admin/rooms')
      .then((res) => {
        setRooms(res.data)
        if (res.data.length > 0) setSelectedRoomId(res.data[0].id)
      })
      .catch(console.error)
      .finally(() => setLoadingRooms(false))
  }, [])

  useEffect(() => {
    if (selectedRoomId) {
      loadRecords()
      loadStudents()
    }
  }, [selectedRoomId, dateFrom, dateTo])

  const loadRecords = async () => {
    setLoadingRecords(true)
    try {
      const res = await api.get(`/api/attendance/room/${selectedRoomId}`, {
        params: { from: dateFrom, to: dateTo },
      })
      setRecords(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRecords(false)
    }
  }

  const loadStudents = async () => {
    try {
      const res = await api.get(`/api/admin/rooms/${selectedRoomId}/students`)
      setStudents(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const selectedRoom = rooms.find((c) => c.id === selectedRoomId)

  // Compute per-student stats
  const studentStats = students.map((student) => {
    const studentRecords = records.filter((r) => r.studentId === student.id)
    const total = studentRecords.length
    const present = studentRecords.filter((r) => r.status === 'present').length
    const absent = studentRecords.filter((r) => r.status === 'absent').length
    const late = studentRecords.filter((r) => r.status === 'late').length
    const excused = studentRecords.filter((r) => r.status === 'excused').length
    const rate = total > 0 ? ((present + late) / total) * 100 : null
    return { ...student, total, present, absent, late, excused, rate }
  })

  // Summary stats
  const totalRecords = records.length
  const presentCount = records.filter((r) => r.status === 'present').length
  const absentCount = records.filter((r) => r.status === 'absent').length
  const lateCount = records.filter((r) => r.status === 'late').length
  const overallRate = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords) * 100 : 0

  const lowAttendanceStudents = studentStats.filter((s) => s.rate !== null && s.rate < 80)

  const exportHeaders = ['Student', 'Present', 'Absent', 'Late', 'Excused', 'Rate']
  const exportRows = studentStats.map((s) => [
    s.name,
    s.present,
    s.absent,
    s.late,
    s.excused,
    s.rate !== null ? `${s.rate.toFixed(0)}%` : 'N/A',
  ])

  const tableColumns = [
    {
      key: 'name',
      header: 'Student',
      render: (s: any) => (
        <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
      ),
    },
    {
      key: 'present',
      header: 'Present',
      render: (s: any) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{s.present}</span>
      ),
    },
    {
      key: 'absent',
      header: 'Absent',
      render: (s: any) => (
        <span className="text-red-600 dark:text-red-400 font-medium">{s.absent}</span>
      ),
    },
    {
      key: 'late',
      header: 'Late',
      render: (s: any) => (
        <span className="text-amber-600 dark:text-amber-400 font-medium">{s.late}</span>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (s: any) => {
        if (s.rate === null) return <span className="text-slate-400">N/A</span>
        const color = s.rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : s.rate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
        return <span className={`font-semibold ${color}`}>{s.rate.toFixed(0)}%</span>
      },
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Overview</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">School-wide attendance tracking</p>
          </div>
          <ExportButtons
            title={`Attendance - ${selectedRoom?.name || 'All'}`}
            headers={exportHeaders}
            rows={exportRows}
            filename={`attendance_${selectedRoom?.name || 'school'}`}
          />
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Room</label>
              {loadingRooms ? (
                <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                >
                  {rooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              )}
            </div>
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
          </div>
        </div>

        {/* Summary */}
        {!loadingRecords && records.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Overall Rate', value: `${overallRate.toFixed(0)}%`, color: overallRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'Present', value: presentCount, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Absent', value: absentCount, color: 'text-red-600 dark:text-red-400' },
              { label: 'Below 80%', value: lowAttendanceStudents.length, color: lowAttendanceStudents.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400' },
            ].map((stat) => (
              <div key={stat.label} className="card text-center py-4">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Low attendance alert */}
        {lowAttendanceStudents.length > 0 && !loadingRecords && (
          <div className="card mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {lowAttendanceStudents.length} student{lowAttendanceStudents.length > 1 ? 's' : ''} below 80% attendance
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowAttendanceStudents.map((s) => (
                <span key={s.id} className="text-xs px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                  {s.name} — {s.rate?.toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {loadingRecords ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">No students in this room.</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <ResponsiveTable
              columns={tableColumns}
              data={studentStats}
              keyField="id"
              emptyMessage="No attendance records for this period"
            />
          </div>
        )}
      </div>
    </div>
  )
}
