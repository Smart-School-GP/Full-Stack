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
  const [assignSubjectName, setAssignSubjectName] = useState('')
  const [parentId, setParentId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [unlinkedStudents, setUnlinkedStudents] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [bulkAssignments, setBulkAssignments] = useState<{subject_name: string, teacher_id: string}[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<any>(null)
  const [isEditMode, setIsEditMode] = useState(false)
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
      setRooms(roomRes.data.data || [])
      setUsers(userRes.data.data || [])
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

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoom) return
    setError('')
    setSaving(true)
    try {
      await api.put(`/api/admin/rooms/${selectedRoom.id}`, {
        name: roomForm.name,
        grade_level: roomForm.grade_level ? parseInt(roomForm.grade_level) : undefined,
      })
      setShowCreateModal(false)
      setIsEditMode(false)
      setSelectedRoom(null)
      setRoomForm({ name: '', grade_level: '' })
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update room')
    } finally { setSaving(false) }
  }

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return
    setError('')
    setSaving(true)
    try {
      await api.delete(`/api/admin/rooms/${roomToDelete.id}`)
      setShowDeleteModal(false)
      setRoomToDelete(null)
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete room')
    } finally { setSaving(false) }
  }

  const openEnrollModal = async (cls: any) => {
    setSelectedRoom(cls)
    setError('')
    setSelectedStudentIds([])
    setUnlinkedStudents([])
    setShowEnrollModal(true)
    try {
      const res = await api.get('/api/admin/unlinked-students')
      setUnlinkedStudents(res.data.data || [])
    } catch (err) { console.error(err) }
  }

  const handleEnrollBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student')
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.post(`/api/admin/rooms/${selectedRoom.id}/students/bulk`, { student_ids: selectedStudentIds })
      setShowEnrollModal(false)
      setSelectedStudentIds([])
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to enroll students')
    } finally { setSaving(false) }
  }

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    )
  }

  const openAssignModal = (cls: any) => {
    setSelectedRoom(cls)
    setError('')
    // Initialize with curriculum subjects
    const initial = (cls.curriculum?.subjects || []).map((s: any) => ({
      subject_name: s.name,
      teacher_id: ''
    }))
    setBulkAssignments(initial.length > 0 ? initial : [{ subject_name: '', teacher_id: '' }])
    setShowAssignModal(true)
  }

  const handleAssignBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = bulkAssignments.filter(a => a.teacher_id && a.subject_name)
    if (valid.length === 0) {
      setError('Please assign at least one teacher to a subject')
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.post(`/api/admin/rooms/${selectedRoom.id}/teachers/bulk`, { 
        assignments: valid
      })
      setShowAssignModal(false)
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign teachers')
    } finally { setSaving(false) }
  }

  const updateBulkAssignment = (index: number, field: string, value: string) => {
    setBulkAssignments(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
  }

  const addBulkAssignmentRow = () => {
    setBulkAssignments(prev => [...prev, { subject_name: '', teacher_id: '' }])
  }

  const removeBulkAssignmentRow = (index: number) => {
    setBulkAssignments(prev => prev.filter((_, i) => i !== index))
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
      setSubjects(res.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load subjects')
    } finally {
      setSubjectsLoading(false)
    }
  }

  const reloadSubjects = async () => {
    if (!selectedRoom) return
    const res = await api.get(`/api/admin/rooms/${selectedRoom.id}/subjects`)
    setSubjects(res.data.data || [])
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

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <button 
                onClick={() => { setIsEditMode(false); setRoomForm({ name: '', grade_level: '' }); setError(''); setShowCreateModal(true) }}
                className="card p-6 flex flex-col items-center justify-center gap-3 hover:border-brand-500 transition-all group"
            >
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Create Room</p>
            </button>
            
            <button 
                onClick={() => { setError(''); setShowLinkModal(true) }}
                className="card p-6 flex flex-col items-center justify-center gap-3 hover:border-brand-500 transition-all group"
            >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 11-5.656 5.656l-1.102-1.101" /></svg>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Link Accounts</p>
            </button>

            <Link 
                href="/admin/curriculum"
                className="card p-6 flex flex-col items-center justify-center gap-3 hover:border-brand-500 transition-all group"
            >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Curriculum</p>
            </Link>

            <Link 
                href="/admin/timetable"
                className="card p-6 flex flex-col items-center justify-center gap-3 hover:border-brand-500 transition-all group"
            >
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Timetables</p>
            </Link>
        </div>

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
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                setSelectedRoom(cls); 
                                setRoomForm({ name: cls.name, grade_level: cls.gradeLevel?.toString() || '' });
                                setIsEditMode(true);
                                setError('');
                                setShowCreateModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                setRoomToDelete(cls);
                                setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
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
                        onClick={() => openEnrollModal(cls)}
                    >
                        Enroll Student
                    </button>
                    <button
                        className="bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent"
                        onClick={() => openAssignModal(cls)}
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

        {/* Create/Edit Room Modal */}
        <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setIsEditMode(false); setSelectedRoom(null) }} title={isEditMode ? 'Edit Room' : 'Create New Room'}>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          <form onSubmit={isEditMode ? handleUpdateRoom : handleCreateRoom} className="space-y-4">
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
              <button type="button" className="btn-secondary flex-1" onClick={() => { setShowCreateModal(false); setIsEditMode(false); setSelectedRoom(null) }}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Room')}</button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Room">
          <div className="mb-6">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-center text-slate-700 dark:text-slate-200 font-medium">
              Are you sure you want to delete <span className="font-bold">{roomToDelete?.name}</span>?
            </p>
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-1 leading-relaxed">
                This will also remove all subjects, timetable slots, and assignments linked to this room.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            <button className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-red-500/20" onClick={handleDeleteRoom} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Room'}
            </button>
          </div>
        </Modal>

        {/* Enroll Student Modal */}
        <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title={`Enroll Students in ${selectedRoom?.name}`}>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Available Students (Unlinked)</p>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {unlinkedStudents.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-400 italic">No unlinked students found.</p>
                </div>
              ) : (
                unlinkedStudents.map((s) => (
                  <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedStudentIds.includes(s.id) 
                      ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-brand-200'
                  }`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudentSelection(s.id)}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-slate-50 dark:border-slate-700/50 mt-4">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               {selectedStudentIds.length} Selected
             </p>
             <div className="flex gap-3">
               <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={() => setShowEnrollModal(false)}>Cancel</button>
               <button 
                 onClick={handleEnrollBulk} 
                 className="btn-primary px-6 py-2 text-xs" 
                 disabled={saving || selectedStudentIds.length === 0}
               >
                 {saving ? 'Enrolling...' : 'Enroll Selected'}
               </button>
             </div>
          </div>
        </Modal>

        {/* Assign Teacher Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Teachers to ${selectedRoom?.name}`}>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">{error}</div>}
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {bulkAssignments.map((row, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3 relative">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Assignment #{idx + 1}</p>
                   {bulkAssignments.length > 1 && (
                     <button onClick={() => removeBulkAssignmentRow(idx)} className="text-red-500 hover:text-red-700">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Subject</label>
                    <input 
                      className="input text-xs" 
                      value={row.subject_name} 
                      onChange={(e) => updateBulkAssignment(idx, 'subject_name', e.target.value)}
                      placeholder="e.g. Mathematics"
                    />
                  </div>
                  <div>
                    <label className="label">Teacher</label>
                    <select 
                      className="input text-xs" 
                      value={row.teacher_id}
                      onChange={(e) => updateBulkAssignment(idx, 'teacher_id', e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            type="button" 
            onClick={addBulkAssignmentRow}
            className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            + Add Another Subject
          </button>

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
            <button className="btn-secondary flex-1 py-2 text-xs" onClick={() => setShowAssignModal(false)}>Cancel</button>
            <button 
              className="btn-primary flex-1 py-2 text-xs" 
              onClick={handleAssignBulk} 
              disabled={saving}
            >
              {saving ? 'Assigning...' : 'Confirm Assignments'}
            </button>
          </div>
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
              const isCurriculum = subj.type === 'curriculum' || subj.isCurriculum
              
              return (
                <div key={subj.id} className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                  isCurriculum ? 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{subj.name}</p>
                      {isCurriculum && (
                        <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[8px] font-black uppercase tracking-tighter rounded">Core</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isCurriculum ? 'Curriculum Subject' : `${subj._count?.assignments ?? 0} assignments`}
                    </p>
                  </div>
                  {!isCurriculum ? (
                    <>
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
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 italic px-2">Managed in Curriculum</span>
                  )}
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
