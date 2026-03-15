'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'

export default function MarkAttendancePage() {
  const params = useParams()
  const classId = params.classId as string
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [className, setClassName] = useState('')

  useEffect(() => {
    loadStudents()
  }, [classId])

  const loadStudents = async () => {
    try {
      const res = await api.get(`/api/attendance/today/${classId}`)
      setStudents(res.data)
      
      const classRes = await api.get(`/api/teacher/classes`)
      const cls = classRes.data.find((c: any) => c.id === classId)
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

  const handleNoteChange = (studentId: string, note: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student.id === studentId ? { ...s, note } : s
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const records = students.map((s) => ({
        student_id: s.student.id,
        status: s.status,
        note: s.note || '',
      }))

      await api.post('/api/attendance', {
        class_id: classId,
        date,
        records,
      })

      alert('Attendance saved successfully!')
      router.push('/teacher/attendance')
    } catch (err) {
      console.error(err)
      alert('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700' },
    { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700' },
    { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{className || 'Mark Attendance'}</h1>
            <p className="text-slate-500 mt-1">Select a date and mark attendance</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : students.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No students in this class</p>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.student.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{s.student.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.student.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            statusOptions.find((opt) => opt.value === s.status)?.color || ''
                          } bg-slate-100 text-slate-600`}
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Optional note..."
                          value={s.note || ''}
                          onChange={(e) => handleNoteChange(s.student.id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
