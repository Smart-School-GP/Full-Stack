'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import SearchableSelect from '@/components/ui/SearchableSelect'
import api from '@/lib/api'
import Link from 'next/link'
import DateTimePicker from '@/components/ui/DateTimePicker'

interface User {
  id: string
  name: string
  surname?: string
  email: string
  role: string
  gradeLevel?: number
  studentParents?: { parent: User }[]
}

export default function NewMeetingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledStudentId = searchParams.get('student_id') || ''

  const [parents, setParents] = useState<User[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    parent_ids: [] as string[],
    student_ids: [] as string[],
    scheduled_at: '',
    duration_minutes: '30',
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studRes, parRes] = await Promise.all([
          api.get('/api/teacher/students'),
          api.get('/api/teacher/parents')
        ])
        
        const fetchedStudents = studRes.data?.data || []
        const fetchedParents = parRes.data?.data || []
        
        setStudents(fetchedStudents)
        setParents(fetchedParents)

        // If prefilled student, select them
        if (prefilledStudentId) {
          setForm(prev => ({ ...prev, student_ids: [prefilledStudentId] }))
          const student = fetchedStudents.find((s: User) => s.id === prefilledStudentId)
          if (student && student.studentParents?.length === 1) {
            setForm(prev => ({ ...prev, parent_ids: [student.studentParents[0].parent.id] }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch scheduling data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [prefilledStudentId])

  const relevantParents = useMemo(() => {
    if (form.student_ids.length === 0) return []
    const selectedStudents = students.filter(s => form.student_ids.includes(s.id))
    const pIds = new Set<string>()
    const pObjs: User[] = []
    
    selectedStudents.forEach(s => {
      s.studentParents?.forEach(sp => {
        if (!pIds.has(sp.parent.id)) {
          pIds.add(sp.parent.id)
          pObjs.push(sp.parent)
        }
      })
    })
    return pObjs
  }, [form.student_ids, students])

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
      router.push(`/teacher/meetings/${res.data.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule meeting.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="page-container max-w-4xl">
        <nav className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-8">
          <Link href="/teacher/meetings" className="hover:text-brand-500 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Meetings
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 dark:text-slate-300">Schedule New</span>
        </nav>

        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Schedule Meeting</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Invite parents to a video call about their children's progress.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm flex gap-3 items-center">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 font-medium">Loading participants...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <SearchableSelect
                      label="Students *"
                      placeholder="Search students..."
                      multiple
                      value={form.student_ids}
                      onChange={(sids) => {
                        setForm({ ...form, student_ids: sids })
                      }}
                      options={students.map(s => ({
                        id: s.id,
                        name: `${s.name} ${s.surname || ''}`,
                        description: `Grade ${s.gradeLevel || 'N/A'} · ${s.email}`
                      }))}
                    />

                    <SearchableSelect
                      label="Parents *"
                      placeholder={form.student_ids.length > 0 ? "Search parents..." : "Select students first"}
                      multiple
                      value={form.parent_ids}
                      onChange={(pids) => setForm({ ...form, parent_ids: pids })}
                      disabled={form.student_ids.length === 0}
                      options={relevantParents.map(p => ({
                        id: p.id,
                        name: `${p.name} ${p.surname || ''}`,
                        description: p.email
                      }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="label">Date & Time *</label>
                      <DateTimePicker
                        value={form.scheduled_at}
                        min={minDatetime}
                        onChange={val => setForm({ ...form, scheduled_at: val })}
                        required
                      />
                    </div>

                    <div>
                      <label className="label">Duration</label>
                      <select
                        className="input h-12"
                        value={form.duration_minutes}
                        onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes (optional)</label>
                    <textarea
                      className="input resize-none rounded-xl"
                      rows={4}
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Topics to discuss, concerns, preparation needed…"
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <Link href="/teacher/meetings" className="btn-secondary flex-1 py-3 justify-center">
                      Cancel
                    </Link>
                    <button 
                      type="submit" 
                      disabled={saving} 
                      className="btn-primary flex-1 py-3 justify-center shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-transform"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Scheduling…
                        </span>
                      ) : 'Confirm Schedule'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-3xl border border-brand-100 dark:border-brand-800">
              <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Video call included</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                A secure video room will be created automatically. The parent will receive a notification and can join via their dashboard.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-800">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Scheduling Policy</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Parents will be notified immediately. Try to schedule at least 24 hours in advance for the best attendance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

