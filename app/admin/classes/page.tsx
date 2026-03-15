'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import api from '@/lib/api'

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [classForm, setClassForm] = useState({ name: '', grade_level: '' })
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [assignTeacherId, setAssignTeacherId] = useState('')
  const [parentId, setParentId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [classRes, userRes] = await Promise.all([
        api.get('/api/admin/classes'),
        api.get('/api/admin/users'),
      ])
      setClasses(classRes.data)
      setUsers(userRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/admin/classes', {
        name: classForm.name,
        grade_level: classForm.grade_level ? parseInt(classForm.grade_level) : undefined,
      })
      setShowCreateModal(false)
      setClassForm({ name: '', grade_level: '' })
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post(`/api/admin/classes/${selectedClass.id}/students`, { student_id: enrollStudentId })
      setShowEnrollModal(false)
      setEnrollStudentId('')
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post(`/api/admin/classes/${selectedClass.id}/teachers`, { teacher_id: assignTeacherId })
      setShowAssignModal(false)
      setAssignTeacherId('')
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/admin/parent-student', { parent_id: parentId, student_id: studentId })
      setShowLinkModal(false)
      setParentId('')
      setStudentId('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const students = users.filter((u) => u.role === 'student')
  const teachers = users.filter((u) => u.role === 'teacher')
  const parents = users.filter((u) => u.role === 'parent')

  return (
    <DashboardLayout>
      <div className="p-8">
        <PageHeader
          title="Classes"
          subtitle={`${classes.length} classes`}
          action={
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => { setError(''); setShowLinkModal(true) }}>
                Link Parent↔Student
              </button>
              <button className="btn-primary" onClick={() => { setError(''); setShowCreateModal(true) }}>
                + New Class
              </button>
            </div>
          }
        />

        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.length === 0 ? (
              <div className="col-span-3 text-center text-slate-400 py-12">No classes yet. Create one!</div>
            ) : classes.map((cls) => (
              <div key={cls.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{cls.name}</h3>
                    {cls.gradeLevel && (
                      <p className="text-xs text-slate-400 mt-0.5">Grade {cls.gradeLevel}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />
                    </svg>
                    {cls._count.students} students
                  </div>
                </div>

                {cls.teachers.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Teachers</p>
                    <div className="flex flex-wrap gap-1">
                      {cls.teachers.map((tc: any) => (
                        <span key={tc.teacher.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {tc.teacher.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    className="btn-secondary text-xs flex-1"
                    onClick={() => { setSelectedClass(cls); setError(''); setShowEnrollModal(true) }}
                  >
                    Enroll Student
                  </button>
                  <button
                    className="btn-secondary text-xs flex-1"
                    onClick={() => { setSelectedClass(cls); setError(''); setShowAssignModal(true) }}
                  >
                    Assign Teacher
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Class Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Class">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div>
              <label className="label">Class Name</label>
              <input className="input" required value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Class 10-A" />
            </div>
            <div>
              <label className="label">Grade Level (optional)</label>
              <input type="number" className="input" value={classForm.grade_level}
                onChange={(e) => setClassForm({ ...classForm, grade_level: e.target.value })} placeholder="e.g. 10" />
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>

        {/* Enroll Student Modal */}
        <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title={`Enroll Student in ${selectedClass?.name}`}>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label className="label">Select Student</label>
              <select className="input" required value={enrollStudentId}
                onChange={(e) => setEnrollStudentId(e.target.value)}>
                <option value="">-- Select a student --</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowEnrollModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Enrolling...' : 'Enroll'}</button>
            </div>
          </form>
        </Modal>

        {/* Assign Teacher Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Teacher to ${selectedClass?.name}`}>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="label">Select Teacher</label>
              <select className="input" required value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(e.target.value)}>
                <option value="">-- Select a teacher --</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </form>
        </Modal>

        {/* Link Parent-Student Modal */}
        <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Link Parent to Student">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleLinkParent} className="space-y-4">
            <div>
              <label className="label">Parent</label>
              <select className="input" required value={parentId}
                onChange={(e) => setParentId(e.target.value)}>
                <option value="">-- Select a parent --</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Student</label>
              <select className="input" required value={studentId}
                onChange={(e) => setStudentId(e.target.value)}>
                <option value="">-- Select a student --</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Linking...' : 'Link'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
