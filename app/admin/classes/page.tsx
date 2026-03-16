'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import ExportButtons from '@/components/ui/ExportButtons'
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

  const exportHeaders = ['Class Name', 'Grade Level', 'Students Count', 'Teachers']
  const exportRows = classes.map(c => [
    c.name,
    c.gradeLevel || 'N/A',
    c._count.students,
    c.teachers.map((tc: any) => tc.teacher.name).join(', ')
  ])

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
        <ExportButtons 
            title="School Classes Export"
            headers={exportHeaders}
            rows={exportRows}
            filename={`classes_export_${new Date().toISOString().split('T')[0]}`}
        />
        <button className="btn-secondary transition-all" onClick={() => { setError(''); setShowLinkModal(true) }}>
            Link Parent↔Student
        </button>
        <button className="btn-primary transition-all shadow-lg shadow-brand-500/20" onClick={() => { setError(''); setShowCreateModal(true) }}>
            + New Class
        </button>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <PageHeader
          title="Classes"
          subtitle={`${classes.length} active class groups`}
          action={actions}
        />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {classes.length === 0 ? (
              <div className="col-span-full card text-center py-20 bg-white dark:bg-slate-800 border-dashed">
                <p className="text-slate-400 dark:text-slate-500">No classes have been defined yet.</p>
              </div>
            ) : classes.map((cls) => (
              <div key={cls.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cls.name}</h3>
                    {cls.gradeLevel && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded">
                        Grade {cls.gradeLevel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded-full px-3 py-1 ml-2 whitespace-nowrap">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />
                    </svg>
                    {cls._count.students}
                  </div>
                </div>

                <div className="space-y-4">
                    {cls.teachers.length > 0 ? (
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Assigned Teachers</p>
                        <div className="flex flex-wrap gap-1.5">
                        {cls.teachers.map((tc: any) => (
                            <span key={tc.teacher.id} className="text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/30">
                            {tc.teacher.name}
                            </span>
                        ))}
                        </div>
                    </div>
                    ) : (
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-600 italic">No teachers assigned</p>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                    <button
                        className="flex-1 bg-slate-50 dark:bg-slate-700/50 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 text-slate-600 dark:text-slate-400 py-2 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-brand-100 dark:hover:border-brand-800"
                        onClick={() => { setSelectedClass(cls); setError(''); setShowEnrollModal(true) }}
                    >
                        Enroll Student
                    </button>
                    <button
                        className="flex-1 bg-slate-50 dark:bg-slate-700/50 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 text-slate-600 dark:text-slate-400 py-2 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-brand-100 dark:hover:border-brand-800"
                        onClick={() => { setSelectedClass(cls); setError(''); setShowAssignModal(true) }}
                    >
                        Assign Teacher
                    </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Class Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Class">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div>
              <label className="label">Class Name</label>
              <input className="input dark:bg-slate-800 dark:border-slate-700" required value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Class 10-A" />
            </div>
            <div>
              <label className="label">Grade Level (optional)</label>
              <input type="number" className="input dark:bg-slate-800 dark:border-slate-700" value={classForm.grade_level}
                onChange={(e) => setClassForm({ ...classForm, grade_level: e.target.value })} placeholder="e.g. 10" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create Class'}</button>
            </div>
          </form>
        </Modal>

        {/* Enroll Student Modal */}
        <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title={`Enroll Student in ${selectedClass?.name}`}>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label className="label">Select Student</label>
              <select className="input dark:bg-slate-800 dark:border-slate-700" required value={enrollStudentId}
                onChange={(e) => setEnrollStudentId(e.target.value)}>
                <option value="">-- Select a student --</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowEnrollModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Enrolling...' : 'Enroll Student'}</button>
            </div>
          </form>
        </Modal>

        {/* Assign Teacher Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Teacher to ${selectedClass?.name}`}>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="label">Select Teacher</label>
              <select className="input dark:bg-slate-800 dark:border-slate-700" required value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(e.target.value)}>
                <option value="">-- Select a teacher --</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Assigning...' : 'Assign Teacher'}</button>
            </div>
          </form>
        </Modal>

        {/* Link Parent-Student Modal */}
        <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Link Parent to Student">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          <form onSubmit={handleLinkParent} className="space-y-4">
            <div>
              <label className="label">Parent Account</label>
              <select className="input dark:bg-slate-800 dark:border-slate-700" required value={parentId}
                onChange={(e) => setParentId(e.target.value)}>
                <option value="">-- Select a parent --</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Student Account</label>
              <select className="input dark:bg-slate-800 dark:border-slate-700" required value={studentId}
                onChange={(e) => setStudentId(e.target.value)}>
                <option value="">-- Select a student --</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Linking Accounts...' : 'Establish Link'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
