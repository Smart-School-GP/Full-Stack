'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useUserStore } from '@/lib/store/userStore'
import { useOfflineSync } from '@/lib/useOfflineSync'
import OfflineBanner from '@/components/ui/OfflineBanner'
import ExportButtons from '@/components/ui/ExportButtons'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import Modal from '@/components/ui/Modal'

export default function MarkAttendancePage() {
  const params = useParams()
  const classIdParam = params.classId
  const roomId = Array.isArray(classIdParam) ? classIdParam[0] : classIdParam
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [className, setClassName] = useState('')
  const [historyStudent, setHistoryStudent] = useState<any>(null)
  const [historyData, setHistoryData] = useState<any>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const { user } = useUserStore()

  const { isOnline, saveOfflineAttendance } = useOfflineSync()

  useEffect(() => {
    if (!roomId) return
    loadStudents()
  }, [roomId])

  const loadStudents = async () => {
    try {
      const res = await api.get(`/api/attendance/today/${roomId}`)
      setStudents(res.data)
      
      const roomRes = await api.get(`/api/teacher/rooms`)
      const cls = roomRes.data.find((c: any) => c.id === roomId)
      if (cls) setClassName(cls.name)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student.id === studentId ? { ...s, status } : s
      )
    )
  }

  const setAllStatus = (status: string) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })))
  }

  const presentCount = students.filter((s) => s.status === 'present').length
  const absentCount = students.filter((s) => s.status === 'absent').length
  const lateCount = students.filter((s) => s.status === 'late').length

  const openHistory = async (student: any) => {
    setHistoryStudent(student)
    setHistoryData(null)
    setHistoryLoading(true)
    try {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      const res = await api.get(`/api/attendance/student/${student.id}`, {
        params: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
      })
      setHistoryData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleNoteChange = (studentId: string, note: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student.id === studentId ? { ...s, note } : s
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const records = students.map((s) => ({
      student_id: s.student.id,
      status: s.status,
      note: s.note || '',
    }))

    if (!isOnline) {
      try {
        if (!user) throw new Error('User not found')
        for (const record of records) {
          await saveOfflineAttendance({
            studentId: record.student_id,
            roomId: roomId,
            date: date,
            status: record.status,
            markedBy: user.id,
          })
        }
        alert('Attendance saved locally. It will sync automatically when you are back online.')
        router.push('/teacher/dashboard')
      } catch (err) {
        console.error(err)
        alert('Failed to save offline attendance')
      } finally {
        setSaving(false)
      }
      return
    }

    try {
      await api.post('/api/attendance', {
        room_id: roomId,
        date,
        records,
      })

      alert('Attendance saved successfully!')
      router.push('/teacher/dashboard')
    } catch (err) {
      console.error(err)
      alert('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ]

  const columns = [
    {
      key: 'name',
      header: 'Student',
      render: (s: any) => (
        <button
          type="button"
          onClick={() => openHistory(s.student)}
          className="text-left font-medium text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 hover:underline transition-colors"
          title="View 30-day attendance history"
        >
          {s.student.name}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: any) => (
        <select
          value={s.status}
          onChange={(e) => handleStatusChange(s.student.id, e.target.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium outline-none transition-colors w-full sm:w-auto ${
            statusOptions.find((opt) => opt.value === s.status)?.color || ''
          } bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'note',
      header: 'Note',
      render: (s: any) => (
        <input
          type="text"
          placeholder="Optional note..."
          value={s.note || ''}
          onChange={(e) => handleNoteChange(s.student.id, e.target.value)}
          className="input py-1.5 text-xs"
        />
      ),
    },
  ]

  const exportHeaders = ['Student Name', 'Status', 'Note', 'Date']
  const exportRows = students.map(s => [s.student.name, s.status, s.note || '', date])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <OfflineBanner />
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{className || 'Mark Attendance'}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Select a date and mark attendance</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-full sm:w-auto h-10"
            />
            <ExportButtons 
              title={`Attendance - ${className} - ${date}`}
              headers={exportHeaders}
              rows={exportRows}
              filename={`attendance_${className}_${date}`}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setAllStatus('present')}
                disabled={students.length === 0}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 border border-transparent hover:border-current shadow-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All Present
              </button>
              <button
                type="button"
                onClick={() => setAllStatus('absent')}
                disabled={students.length === 0}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 border border-transparent hover:border-current shadow-sm bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                All Absent
              </button>
              <button
                type="button"
                onClick={() => setAllStatus('present')}
                disabled={students.length === 0}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 border border-transparent hover:border-current shadow-sm bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                title="Reset all to present"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
              <Link
                href="/teacher/attendance/vision"
                className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all hover:scale-105 border border-transparent hover:border-current shadow-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                AI Vision
              </Link>
              <Link
                href={`/teacher/attendance/${roomId}/history`}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all hover:scale-105 border border-transparent hover:border-current shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Room History
              </Link>
            </div>

            {/* Live tally */}
            {students.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold">
                  Present {presentCount}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-bold">
                  Absent {absentCount}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-bold">
                  Late {lateCount}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold ml-auto">
                  {students.length} total
                </span>
              </div>
            )}

            <div className="card p-0 overflow-hidden bg-transparent border-none shadow-none md:bg-white md:dark:bg-slate-800 md:border md:shadow-sm">
              <ResponsiveTable
                columns={columns}
                data={students}
                keyField="student.id"
                emptyMessage="No students in this room"
              />
            </div>


            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-8"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Per-student attendance history modal */}
      <Modal
        isOpen={!!historyStudent}
        onClose={() => { setHistoryStudent(null); setHistoryData(null) }}
        title={historyStudent ? `${historyStudent.name} — Last 30 Days` : ''}
        size="lg"
      >
        {historyLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !historyData ? (
          <p className="text-sm text-slate-400 text-center py-6">No data available.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Present</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{historyData.summary?.present ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">Absent</p>
                <p className="text-2xl font-black text-red-700 dark:text-red-400">{historyData.summary?.absent ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Late</p>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{historyData.summary?.late ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">Excused</p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{historyData.summary?.excused ?? 0}</p>
              </div>
            </div>

            {historyData.summary?.rate !== undefined && (
              <div className="text-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Attendance rate: </span>
                <span className={`font-bold ${
                  historyData.summary.rate >= 90 ? 'text-emerald-600' :
                  historyData.summary.rate >= 75 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {historyData.summary.rate.toFixed(1)}%
                </span>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              {(historyData.records || []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No attendance records yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {historyData.records.map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {new Date(r.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'present' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            r.status === 'absent' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            r.status === 'late' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">{r.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
