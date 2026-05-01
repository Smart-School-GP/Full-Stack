'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import api from '@/lib/api'
import { SubjectTable } from '@/components/subjects/SubjectTable'

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

interface CurriculumViewProps {
  isAdmin: boolean
}

export default function CurriculumView({ isAdmin }: CurriculumViewProps) {
  const router = useRouter()
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
        api.get('/api/curriculum'),
        isAdmin ? api.get('/api/admin/learning-paths') : Promise.resolve({ data: [] })
      ])
      setCurriculums(curRes.data)
      if (isAdmin) setAvailablePaths(pathRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadDetails = async (id: string) => {
    try {
      const res = await api.get(`/api/curriculum/${id}`)
      setSelectedCurriculum(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { load() }, [])

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCurriculum || !isAdmin) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/api/curriculum/${selectedCurriculum.id}/subjects`, { 
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
    if (!isAdmin) return
    if (!confirm('Are you sure you want to remove this course requirement from the program?')) return
    try {
      await api.delete(`/api/curriculum/subjects/${subjectId}`)
      if (selectedCurriculum) {
        await Promise.all([loadDetails(selectedCurriculum.id), load()])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateCurriculum = async (grade: number) => {
    if (!isAdmin) return
    try {
      const res = await api.post('/api/curriculum', { gradeLevel: grade, name: `Grade ${grade} Program` })
      await load()
      if (res.data?.id) await loadDetails(res.data.id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
      <PageHeader
        title="School Curriculum"
        subtitle={isAdmin ? "Define core course requirements for each grade level." : "View the core course requirements and learning paths for each grade level."}
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
                  onClick={() => {
                    if (curriculum) {
                      loadDetails(curriculum.id)
                    } else if (isAdmin) {
                      handleCreateCurriculum(grade)
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    selectedCurriculum?.gradeLevel === grade
                      ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:border-brand-300'
                  } ${!curriculum && !isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!curriculum && !isAdmin}
                >
                  <span className="font-bold">Grade {grade}</span>
                  {curriculum ? (
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      selectedCurriculum?.gradeLevel === grade ? 'bg-white/20 text-white' : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                    }`}>
                      {curriculum._count?.subjects || 0} Courses
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 italic">
                      {isAdmin ? 'Uninitialized' : 'Not available'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Program Content */}
        <div className="xl:col-span-3">
          {selectedCurriculum ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                 <div className="relative flex items-center justify-between">
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Grade {selectedCurriculum.gradeLevel} Core Program</h2>
                      <p className="text-slate-400 text-sm mt-1">
                        {isAdmin ? 'Management of core course requirements and associated courses.' : 'View the core course requirements and linked learning materials.'}
                      </p>
                   </div>
                   {isAdmin && (
                     <div className="flex items-center gap-3">
                        <button
                          onClick={() => router.push(`/admin/timetable/builder?mode=grade&grade=${selectedCurriculum.gradeLevel}`)}
                          className="btn-secondary"
                        >
                          Build Timetable
                        </button>
                        <button
                            onClick={() => { setError(''); setNewSubjectName(''); setSelectedPathId(''); setShowAddSubject(true) }}
                            className="btn-primary"
                        >
                            + Add Course
                        </button>
                     </div>
                   )}
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/10">
                  <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-widest text-xs">Core Course Requirements</h3>
                </div>
                <div className="p-6">
                  <SubjectTable
                    subjects={selectedCurriculum.subjects.map(s => ({
                      ...s,
                      pathCount: s.learningPaths?.length || 0
                    }))}
                    isAdmin={isAdmin}
                    onDelete={handleDeleteSubject}
                    mode="curriculum"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 text-center">
              <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mb-6">
                 <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Program Selected</h3>
              <p className="text-slate-400 text-sm max-w-sm mt-2">
                {isAdmin 
                  ? "Select a grade from the sidebar to view and manage its core course requirements."
                  : "Select a grade from the sidebar to explore its curriculum and courses."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Subject Modal */}
      {isAdmin && (
        <Modal isOpen={showAddSubject} onClose={() => setShowAddSubject(false)} title="Add Core Course">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div>
              <label className="label">Course Name</label>
              <input
                className="input dark:bg-slate-800 dark:border-slate-700"
                required
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Advanced Physics"
              />
            </div>
            <div>
              <label className="label">Link Detailed Course (Optional)</label>
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
              <p className="text-[10px] text-slate-400 mt-1 italic">Showing unlinked or room-specific courses.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAddSubject(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Adding...' : 'Add Course'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
