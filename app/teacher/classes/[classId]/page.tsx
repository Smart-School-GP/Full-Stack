'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import api from '@/lib/api'

export default function TeacherClassDetailPage() {
  const { classId } = useParams()
  const [students, setStudents] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [className, setClassName] = useState('')

  const load = async () => {
    try {
      const [studentsRes, subjectsRes, classesRes] = await Promise.all([
        api.get(`/api/teacher/classes/${classId}/students`),
        api.get(`/api/teacher/classes/${classId}/subjects`),
        api.get('/api/teacher/classes'),
      ])
      setStudents(studentsRes.data)
      setSubjects(subjectsRes.data)
      const cls = classesRes.data.find((c: any) => c.id === classId)
      setClassName(cls?.name || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [classId])

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/teacher/subjects', { class_id: classId, name: subjectName })
      setShowSubjectModal(false)
      setSubjectName('')
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <Link href="/teacher/classes" className="hover:text-brand-500">Classes</Link>
          <span>/</span>
          <span className="text-slate-600">{className}</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{className}</h1>
            <p className="text-slate-500 mt-1">{students.length} students · {subjects.length} subjects</p>
          </div>
          <button className="btn-primary" onClick={() => { setError(''); setShowSubjectModal(true) }}>
            + New Subject
          </button>
        </div>

        {loading ? <div className="text-slate-400">Loading...</div> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subjects */}
            <div className="lg:col-span-2">
              <h2 className="font-semibold text-slate-700 mb-3">Subjects</h2>
              {subjects.length === 0 ? (
                <div className="card text-center py-8 text-slate-400">
                  No subjects yet. Create one to start grading.
                </div>
              ) : (
                <div className="space-y-3">
                  {subjects.map((subj) => (
                    <Link key={subj.id} href={`/teacher/subjects/${subj.id}`}>
                      <div className="card hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-800 group-hover:text-brand-600">{subj.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {subj._count.assignments} assignments ·{' '}
                            {subj.gradingAlgorithm ? (
                              <span className="text-emerald-600">Algorithm set ✓</span>
                            ) : (
                              <span className="text-amber-500">No algorithm set</span>
                            )}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Students Roster */}
            <div>
              <h2 className="font-semibold text-slate-700 mb-3">Students ({students.length})</h2>
              <div className="card p-0 overflow-hidden">
                {students.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No students enrolled</p>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {students.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-semibold">
                          {s.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <Modal isOpen={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Create Subject">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <label className="label">Subject Name</label>
              <input className="input" required value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Mathematics" />
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowSubjectModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
