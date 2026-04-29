'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import ExportButtons from '@/components/ui/ExportButtons'
import Link from 'next/link'
import api from '@/lib/api'

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showSubjectsModal, setShowSubjectsModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [roomForm, setRoomForm] = useState({ name: '', grade_level: '' })
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [assignTeacherId, setAssignTeacherId] = useState('')
  const [parentId, setParentId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [subjects, setSubjects] = useState<any[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState('')

  const load = async () => {
    try {
      const [roomRes, userRes] = await Promise.all([
        api.get('/api/admin/rooms'),
        api.get('/api/admin/users'),
      ])
      setRooms(roomRes.data)
      setUsers(userRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/admin/rooms', {
        name: roomForm.name,
        grade_level: roomForm.grade_level ? parseInt(roomForm.grade_level) : undefined,
      })
      setShowCreateModal(false)
      setRoomForm({ name: '', grade_level: '' })
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
      await api.post(`/api/admin/rooms/${selectedRoom.id}/students`, { student_id: enrollStudentId })
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
      await api.post(`/api/admin/rooms/${selectedRoom.id}/teachers`, { teacher_id: assignTeacherId })
      setShowAssignModal(false)
      setAssignTeacherId('')
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const openSubjectsModal = async (cls: any) => {
    setSelectedRoom(cls)
    setError('')
    setNewSubjectName('')
    setNewSubjectTeacherId('')
    setSubjects([])
    setShowSubjectsModal(true)
    setSubjectsLoading(true)
    try {
      const res = await api.get(`/api/admin/rooms/${cls.id}/subjects`)
      setSubjects(res.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load subjects')
    } finally {
      setSubjectsLoading(false)
    }
  }

  const reloadSubjects = async () => {
    if (!selectedRoom) return
    const res = await api.get(`/api/admin/rooms/${selectedRoom.id}/subjects`)
    setSubjects(res.data)
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post(`/api/admin/rooms/${selectedRoom.id}/subjects`, {
        name: newSubjectName,
        teacher_id: newSubjectTeacherId || null,
      })
      setNewSubjectName('')
      setNewSubjectTeacherId('')
      await reloadSubjects()
      load()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create subject')
    } finally {
      setSaving(false)
    }
  }

  const handleReassignSubject = async (subjectId: string, teacherId: string) => {
    setError('')
    try {
      await api.patch(`/api/admin/subjects/${subjectId}`, { teacher_id: teacherId || null })
      await reloadSubjects()
      load()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reassign teacher')
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Delete this subject? This will remove all of its assignments and grades.')) return
    setError('')
    try {
      await api.delete(`/api/admin/subjects/${subjectId}`)
      await reloadSubjects()
      load()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete subject')
    }
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

  const exportHeaders = ['Room Name', 'Grade Level', 'Students Count', 'Teachers']
  const exportRows = rooms.map(c => [
    c.name,
    c.gradeLevel || 'N/A',
    c._count.students,
    c.teachers.map((tc: any) => tc.teacher.name).join(', ')
  ])

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
        <ExportButtons 
            title="School Rooms Export"
            headers={exportHeaders}
            rows={exportRows}
            filename={`rooms_export_${new Date().toISOString().split('T')[0]}`}
        />
        <button className="btn-primary transition-all shadow-lg shadow-brand-500/20" onClick={() => { setError(''); setShowCreateModal(true) }}>
          + New Room
        </button>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <PageHeader
          title="Rooms"
          subtitle={`${rooms.length} active room groups`}
          action={actions}
        />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rooms.length === 0 ? (
              <div className="col-span-full card text-center py-20 bg-white dark:bg-slate-800 border-dashed">
                <p className="text-slate-400 dark:text-slate-500">No rooms have been defined yet.</p>
              </div>
            ) : rooms.map((cls) => (
              <div key={cls.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <Link href={`/admin/rooms/${cls.id}`} className="block p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{cls.name}</h3>
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
                  </div>
                </Link>

                <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                    <Link
                        href={`/admin/rooms/${cls.id}`}
                        className="bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-brand-700 dark:text-brand-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all border border-brand-100 dark:border-brand-800/30 flex items-center justify-center"
                    >
                        View Details
                    </Link>
                    <button
                        className="bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent"
                        onClick={() => { setSelectedRoom(cls); setError(''); setShowEnrollModal(true) }}
                    >
                        Enroll Student
                    </button>
                    <button
                        className="bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent"
                        onClick={() => { setSelectedRoom(cls); setError(''); setShowAssignModal(true) }}
                    >
                        Assign Teacher
                    </button>
                    <button
                        className="bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent"
                        onClick={() => openSubjectsModal(cls)}
                    >
                        Manage Subjects
                    </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Room Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Room">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="label">Room Name</label>
              <input className="input dark:bg-slate-800 dark:border-slate-700" required value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. Room 10-A" />
            </div>
            <div>
              <label className="label">Grade Level (optional)</label>
              <input type="number" className="input dark:bg-slate-800 dark:border-slate-700" value={roomForm.grade_level}
                onChange={(e) => setRoomForm({ ...roomForm, grade_level: e.target.value })} placeholder="e.g. 10" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create Room'}</button>
            </div>
          </form>
        </Modal>

        {/* Enroll Student Modal */}
        <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title={`Enroll Student in ${selectedRoom?.name}`}>
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
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Teacher to ${selectedRoom?.name}`}>
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

        {/* Manage Subjects Modal */}
        <Modal isOpen={showSubjectsModal} onClose={() => setShowSubjectsModal(false)} title={`Subjects in ${selectedRoom?.name || ''}`}>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}

          {/* Existing subjects */}
          <div className="space-y-2 mb-6">
            {subjectsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No subjects in this room yet.</p>
            ) : subjects.map((subj) => {
              const roomTeacherIds = (selectedRoom?.teachers || []).map((tc: any) => tc.teacher.id)
              const eligibleTeachers = teachers.filter((t) => roomTeacherIds.includes(t.id))
              return (
                <div key={subj.id} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{subj.name}</p>
                    <p className="text-[11px] text-slate-400">{subj._count?.assignments ?? 0} assignments</p>
                  </div>
                  <select
                    className="input dark:bg-slate-800 dark:border-slate-700 text-xs py-1.5 max-w-[180px]"
                    value={subj.teacherId || ''}
                    onChange={(e) => handleReassignSubject(subj.id, e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {eligibleTeachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubject(subj.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest px-2"
                    aria-label={`Delete ${subj.name}`}
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add new */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Add Subject</p>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="label">Subject Name</label>
                <input className="input dark:bg-slate-800 dark:border-slate-700" required value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)} placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="label">Assign Teacher</label>
                <select className="input dark:bg-slate-800 dark:border-slate-700" value={newSubjectTeacherId}
                  onChange={(e) => setNewSubjectTeacherId(e.target.value)}>
                  <option value="">— Leave unassigned —</option>
                  {(selectedRoom?.teachers || []).map((tc: any) => (
                    <option key={tc.teacher.id} value={tc.teacher.id}>{tc.teacher.name}</option>
                  ))}
                </select>
                {(selectedRoom?.teachers || []).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No teachers assigned to this room yet — assign one first to be able to give them subjects.</p>
                )}
              </div>
              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? 'Adding...' : 'Add Subject'}
              </button>
            </form>
          </div>
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
