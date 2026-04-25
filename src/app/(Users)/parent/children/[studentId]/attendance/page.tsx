'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function ParentChildAttendancePage() {
  const { studentId } = useParams()
  const router = useRouter()
  const [attendance, setAttendance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (studentId) loadAttendance()
  }, [studentId, from, to])

  const loadAttendance = () => {
    api.get(`/api/attendance/student/${studentId}?from=${from}&to=${to}`)
      .then((res) => setAttendance(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
      case 'absent':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      case 'late':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      case 'excused':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-2"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Attendance Record</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View your child's attendance history</p>
        </div>

        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading...</div>
        ) : !attendance ? (
          <div className="card text-center py-12">
            <p className="text-slate-400 dark:text-slate-500">No attendance records found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="card">
                <p className="text-2xl font-bold text-slate-800">{attendance.summary?.total || 0}</p>
                <p className="text-sm text-slate-500">Total Days</p>
              </div>
              <div className="card">
                <p className="text-2xl font-bold text-emerald-600">{attendance.summary?.present || 0}</p>
                <p className="text-sm text-slate-500">Present</p>
              </div>
              <div className="card">
                <p className="text-2xl font-bold text-red-600">{attendance.summary?.absent || 0}</p>
                <p className="text-sm text-slate-500">Absent</p>
              </div>
              <div className="card">
                <p className="text-2xl font-bold text-amber-600">{attendance.summary?.late || 0}</p>
                <p className="text-sm text-slate-500">Late</p>
              </div>
              <div className="card">
                <p className={`text-2xl font-bold ${
                  (attendance.summary?.rate || 0) >= 90 ? 'text-emerald-600' :
                  (attendance.summary?.rate || 0) >= 75 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {attendance.summary?.rate?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-slate-500">Attendance Rate</p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Room</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {attendance.records?.map((record: any) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {record.room?.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {record.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
