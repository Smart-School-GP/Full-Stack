'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import api from '@/lib/api'

interface CurriculumSubject {
  id: string
  name: string
  learningPaths: { id: string; title: string; isPublished: boolean }[]
}

interface Curriculum {
  id: string
  gradeLevel: number
  name: string | null
  subjects: CurriculumSubject[]
  _count?: { subjects: number }
}

interface PathOption {
  id: string
  title: string
  curriculumSubjectId: string | null
  subjectId: string | null
}

export default function AdminCurriculumPage() {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [availablePaths, setAvailablePaths] = useState<PathOption[]>([])
  const [selectedPathId, setSelectedPathId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [curRes, pathRes] = await Promise.all([
        api.get('/api/admin/curriculum'),
        api.get('/api/admin/learning-paths')
      ])
      setCurriculums(curRes.data)
      setAvailablePaths(pathRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadDetails = async (id: string) => {
    try {
      const res = await api.get(`/api/admin/curriculum/${id}`)
      setSelectedCurriculum(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { load() }, [])

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCurriculum) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/api/admin/curriculum/${selectedCurriculum.id}/subjects`, { 
        name: newSubjectName,
        learningPathId: selectedPathId || null 
      })
      setNewSubjectName('')
      setSelectedPathId('')
      setShowAddSubject(false)
      await Promise.all([loadDetails(selectedCurriculum.id), load()])
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add subject')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to remove this subject from the curriculum?')) return
    try {
      await api.delete(`/api/admin/curriculum/subjects/${subjectId}`)
      if (selectedCurriculum) {
        await Promise.all([loadDetails(selectedCurriculum.id), load()])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateCurriculum = async (grade: number) => {
    try {
      const res = await api.post('/api/admin/curriculum', { gradeLevel: grade, name: `Grade ${grade} Curriculum` })
      await load()
      if (res.data?.id) await loadDetails(res.data.id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <PageHeader
          title="Grade-Level Curriculums"
          subtitle="Define core subjects (Core Curriculums) for each grade level."
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Grade Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">Grades</h2>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => {
                const curriculum = curriculums.find(c => c.gradeLevel === grade)
                return (
                  <button
                    key={grade}
                    onClick={() => curriculum ? loadDetails(curriculum.id) : handleCreateCurriculum(grade)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      selectedCurriculum?.gradeLevel === grade
                        ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:border-brand-300'
                    }`}
                  >
                    <span className="font-bold">Grade {grade}</span>
                    {curriculum ? (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        selectedCurriculum?.gradeLevel === grade ? 'bg-white/20 text-white' : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                      }`}>
                        {curriculum._count?.subjects || 0} Subjects
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 italic">Uninitialized</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Curriculum Content */}
          <div className="xl:col-span-3">
            {selectedCurriculum ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                   <div className="relative flex items-center justify-between">
                     <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Grade {selectedCurriculum.gradeLevel} Core Curriculum</h2>
                        <p className="text-slate-400 text-sm mt-1">Management of core subjects and associated learning paths.</p>
                     </div>
                     <button
                        onClick={() => { setError(''); setNewSubjectName(''); setSelectedPathId(''); setShowAddSubject(true) }}
                        className="btn-primary"
                     >
                        + Add Subject
                     </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCurriculum.subjects.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                       <p className="text-slate-400 italic">No subjects added to this curriculum yet.</p>
                    </div>
                  ) : selectedCurriculum.subjects.map((subject) => (
                    <div key={subject.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col group hover:border-brand-200 transition-colors">
                      <div className="p-6 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/10">
                        <h3 className="font-bold text-slate-800 dark:text-white">{subject.name}</h3>
                        <button
                          onClick={() => handleDeleteSubject(subject.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove subject"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Learning Paths</span>
                         </div>
                         {subject.learningPaths.length === 0 ? (
                           <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <p className="text-[10px] text-slate-400 font-medium italic">No paths linked yet.</p>
                              <p className="text-[9px] text-slate-300 mt-1">Paths can be linked from the Learning Paths page.</p>
                           </div>
                         ) : (
                           <div className="space-y-2">
                             {subject.learningPaths.map((path) => (
                               <div key={path.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                 <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{path.title}</p>
                                    <p className="text-[9px] text-slate-400">{path.isPublished ? 'Published' : 'Draft'}</p>
                                 </div>
                                 <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                               </div>
                             ))}
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-center">
                <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Curriculum Selected</h3>
                <p className="text-slate-400 text-sm max-w-sm mt-2">Select a grade from the sidebar to view and manage its core curriculum subjects.</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Subject Modal */}
        <Modal isOpen={showAddSubject} onClose={() => setShowAddSubject(false)} title="Add Core Subject">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div>
              <label className="label">Subject Name</label>
              <input
                className="input dark:bg-slate-800 dark:border-slate-700"
                required
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Advanced Physics"
              />
            </div>
            <div>
              <label className="label">Link Learning Path (Optional)</label>
              <select 
                className="input dark:bg-slate-800 dark:border-slate-700"
                value={selectedPathId}
                onChange={(e) => setSelectedPathId(e.target.value)}
              >
                <option value="">— No path linked —</option>
                {availablePaths.filter(p => !p.curriculumSubjectId).map(path => (
                  <option key={path.id} value={path.id}>
                    {path.title} {path.subjectId ? '(Currently Room Specific)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1 italic">Showing unlinked or room-specific paths.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAddSubject(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Adding...' : 'Add Subject'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
