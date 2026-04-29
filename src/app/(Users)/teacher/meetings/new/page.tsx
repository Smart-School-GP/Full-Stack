'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import api from '@/lib/api'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
  studentParents?: { parent: User }[]
}

export default function NewMeetingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledStudentId = searchParams.get('student_id') || ''

  const [parents, setParents] = useState<User[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [studentToParents, setStudentToParents] = useState<Record<string, User[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    parent_id: '',
    student_id: prefilledStudentId,
    scheduled_at: '',
    duration_minutes: '30',
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get all students in teacher's rooms
        const roomsRes = await api.get('/api/teacher/rooms')
        const rooms = roomsRes.data || []
        
        const allStudents: User[] = []
        const parentMap: Record<string, User[]> = {}
        const uniqueParents: Record<string, User> = {}

        for (const cls of rooms) {
          const studRes = await api.get(`/api/teacher/rooms/${cls.id}/students`)
          const roomStudents = studRes.data || []
          
          roomStudents.forEach((s: User) => {
            if (!allStudents.find(x => x.id === s.id)) {
              allStudents.push(s)
            }
            
            // Build parent mapping from studentParents array
            const studentParents = s.studentParents?.map(sp => sp.parent) || []
            parentMap[s.id] = studentParents
            
            studentParents.forEach(p => {
              uniqueParents[p.id] = p
            })
          })
        }
        
        setStudents(allStudents.sort((a, b) => a.name.localeCompare(b.name)))
        setParents(Object.values(uniqueParents))
        setStudentToParents(parentMap)

        // If prefilled student has exactly one parent, auto-select them
        if (prefilledStudentId && parentMap[prefilledStudentId]?.length === 1) {
          setForm(prev => ({ ...prev, parent_id: parentMap[prefilledStudentId][0].id }))
        }
      } catch (err) {
        console.error('Failed to fetch scheduling data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [prefilledStudentId])

  // Strictly filter parents related to selected student
  const relevantParents = useMemo(() => {
    if (!form.student_id) return []
    return studentToParents[form.student_id] || []
  }, [form.student_id, studentToParents])

  // Set min datetime to now + 10 minutes
  const minDatetime = new Date(Date.now() + 10 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await api.post('/api/meetings', {
        ...form,
        duration_minutes: parseInt(form.duration_minutes),
      })
      router.push(`/teacher/meetings/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule meeting.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/teacher/meetings" className="hover:text-brand-500">Meetings</Link>
          <span>/</span>
          <span className="text-slate-600">Schedule New</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Schedule Meeting</h1>
          <p className="text-slate-500 mt-1">Invite a parent to a video call about their child's progress.</p>
        </div>

        <div className="max-w-xl">
          <div className="card">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">Student *</label>
                  <select
                    className="input"
                    value={form.student_id}
                    onChange={e => {
                      const sid = e.target.value
                      const parentsForSid = studentToParents[sid] || []
                      setForm({ 
                        ...form, 
                        student_id: sid, 
                        parent_id: parentsForSid.length === 1 ? parentsForSid[0].id : '' 
                      })
                    }}
                    required
                  >
                    <option value="">— Select student —</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Parent *</label>
                  <select
                    className="input"
                    value={form.parent_id}
                    onChange={e => setForm({ ...form, parent_id: e.target.value })}
                    required
                    disabled={!form.student_id || relevantParents.length === 0}
                  >
                    <option value="">— Select parent —</option>
                    {relevantParents.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {!form.student_id ? (
                    <p className="text-[10px] text-slate-400 mt-1">Please select a student first.</p>
                  ) : relevantParents.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No parents linked to this student.
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.scheduled_at}
                    min={minDatetime}
                    onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Duration</label>
                  <select
                    className="input"
                    value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Topics to discuss, concerns, preparation needed…"
                  />
                </div>

                <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-700">
                  <p className="font-semibold mb-0.5">📹 Video call included</p>
                  <p>A secure video room will be created automatically. The parent will receive a notification with meeting details.</p>
                </div>

                <div className="flex gap-3 pt-1">
                  <Link href="/teacher/meetings" className="btn-secondary flex-1 text-center py-2.5">
                    Cancel
                  </Link>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                    {saving ? 'Scheduling…' : 'Schedule Meeting'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
