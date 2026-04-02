'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import Modal from '@/components/ui/Modal'
import GradeBadge from '@/components/ui/GradeBadge'
import Link from 'next/link'
import api from '@/lib/api'
import EmptyState from '@/components/ui/EmptyState'

export default function TeacherSubjectPage() {
  const { subjectId } = useParams()
  const [subject, setSubject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showGradeModal, setShowGradeModal] = useState(false)

  // Forms
  const [algorithmForm, setAlgorithmForm] = useState<Record<string, string>>({})
  const [assignmentForm, setAssignmentForm] = useState({ title: '', type: 'exam', max_score: '100' })
  const [gradeForm, setGradeForm] = useState({ student_id: '', assignment_id: '', score: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const parseWeights = (w: any): Record<string, number> => {
    if (!w) return {}
    if (typeof w === 'string') { try { return JSON.parse(w) } catch { return {} } }
    return w as Record<string, number>
  }

  const load = async () => {
    try {
      const res = await api.get(`/api/teacher/subjects/${subjectId}`)
      setSubject(res.data)
      if (res.data.gradingAlgorithm) {
        const w = parseWeights(res.data.gradingAlgorithm.weights)
        setAlgorithmForm(Object.fromEntries(Object.entries(w).map(([k, v]) => [k, String(v)])))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [subjectId])

  const handleSetAlgorithm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const weights: Record<string, number> = {}
    for (const [k, v] of Object.entries(algorithmForm)) {
      if (k.trim() && v) weights[k.trim()] = parseFloat(v)
    }
    try {
      await api.put(`/api/teacher/subjects/${subjectId}/algorithm`, { weights })
      setShowAlgorithmModal(false)
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/teacher/assignments', {
        subject_id: subjectId,
        title: assignmentForm.title,
        type: assignmentForm.type,
        max_score: parseFloat(assignmentForm.max_score),
      })
      setShowAssignmentModal(false)
      setAssignmentForm({ title: '', type: 'exam', max_score: '100' })
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const handleEnterGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/teacher/grades', {
        student_id: gradeForm.student_id,
        assignment_id: gradeForm.assignment_id,
        score: parseFloat(gradeForm.score),
      })
      setShowGradeModal(false)
      setGradeForm({ student_id: '', assignment_id: '', score: '' })
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    } finally { setSaving(false) }
  }

  const getGrade = (studentId: string, assignmentId: string) => {
    if (!subject?.grades) return null
    const g = subject.grades.find((g: any) => g.studentId === studentId && g.assignmentId === assignmentId)
    return g ? g.score : null
  }

  const getFinalGrade = (studentId: string) => {
    if (!subject?.finalGrades) return null
    const fg = subject.finalGrades.find((fg: any) => fg.studentId === studentId)
    return fg?.finalScore ?? null
  }

  const students = subject?.class?.students?.map((sc: any) => sc.student) || []
  const assignments = subject?.assignments || []

  if (loading) return <DashboardLayout><div className="p-8 text-slate-400">Loading...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <Link href="/teacher/classes" className="hover:text-brand-500">Classes</Link>
          <span>/</span>
          <Link href={`/teacher/classes/${subject?.classId}`} className="hover:text-brand-500">
            {subject?.class?.name}
          </Link>
          <span>/</span>
          <span className="text-slate-600">{subject?.name}</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{subject?.name}</h1>
            <p className="text-slate-500 mt-1">{students.length} students · {assignments.length} assignments</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => { setError(''); setShowAlgorithmModal(true) }}>
              ⚖️ Grading Algorithm
            </button>
            <button className="btn-secondary" onClick={() => { setError(''); setShowAssignmentModal(true) }}>
              + Assignment
            </button>
            <button className="btn-primary" onClick={() => { setError(''); setShowGradeModal(true) }}>
              + Enter Grade
            </button>
          </div>
        </div>

        {/* Algorithm Info */}
        {subject?.gradingAlgorithm && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm font-medium text-blue-800 mb-2">Grading Algorithm</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(parseWeights(subject.gradingAlgorithm.weights)).map(([type, weight]) => (
                <span key={type} className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded-full capitalize">
                  {type}: <strong>{(Number(weight) * 100).toFixed(0)}%</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Grade Grid */}
        {students.length === 0 || assignments.length === 0 ? (
          <div className="card">
            <EmptyState
              title={students.length === 0 ? 'No Students Enrolled' : 'No Assignments Yet'}
              message={students.length === 0 ? 'No students are enrolled in this class.' : 'Create an assignment to start entering grades.'}
              icon={
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={students.length === 0 ? 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' : 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'} />
                </svg>
              }
            />
          </div>
        ) : (
          <div className="card p-0 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[180px]">Student</th>
                  {assignments.map((a: any) => (
                    <th key={a.id} className="px-4 py-3 font-semibold text-slate-600 text-center min-w-[120px]">
                      <div>{a.title}</div>
                      <div className="font-normal text-xs text-slate-400 capitalize">{a.type} / {a.maxScore}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-slate-600 text-center bg-brand-50 min-w-[100px]">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((student: any) => (
                  <tr key={student.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{student.name}</td>
                    {assignments.map((a: any) => {
                      const score = getGrade(student.id, a.id)
                      return (
                        <td key={a.id} className="px-4 py-3 text-center">
                          {score !== null ? (
                            <span className={`text-sm font-medium ${score / a.maxScore >= 0.5 ? 'text-slate-700' : 'text-red-500'}`}>
                              {Number(score).toFixed(1)}/{a.maxScore}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center bg-brand-50/30">
                      <GradeBadge score={getFinalGrade(student.id)} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Algorithm Modal */}
        <Modal isOpen={showAlgorithmModal} onClose={() => setShowAlgorithmModal(false)} title="Set Grading Algorithm">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <p className="text-sm text-slate-500 mb-4">Set the weight for each assignment type. Weights should ideally sum to 1.0.</p>
          <form onSubmit={handleSetAlgorithm} className="space-y-4">
            {['exam', 'homework', 'project', 'quiz'].map((type) => (
              <div key={type} className="flex items-center gap-3">
                <label className="label capitalize w-24 mb-0">{type}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="input"
                  placeholder="0.0–1.0"
                  value={algorithmForm[type] || ''}
                  onChange={(e) => setAlgorithmForm({ ...algorithmForm, [type]: e.target.value })}
                />
              </div>
            ))}
            <p className="text-xs text-slate-400">Types with empty weights are excluded from calculation.</p>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAlgorithmModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Algorithm'}</button>
            </div>
          </form>
        </Modal>

        {/* Assignment Modal */}
        <Modal isOpen={showAssignmentModal} onClose={() => setShowAssignmentModal(false)} title="Create Assignment">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input className="input" required value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                placeholder="e.g. Midterm Exam" />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={assignmentForm.type}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value })}>
                <option value="exam">Exam</option>
                <option value="homework">Homework</option>
                <option value="project">Project</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <div>
              <label className="label">Max Score</label>
              <input type="number" className="input" value={assignmentForm.max_score}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAssignmentModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>

        {/* Grade Entry Modal */}
        <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title="Enter Grade">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleEnterGrade} className="space-y-4">
            <div>
              <label className="label">Student</label>
              <select className="input" required value={gradeForm.student_id}
                onChange={(e) => setGradeForm({ ...gradeForm, student_id: e.target.value })}>
                <option value="">-- Select student --</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assignment</label>
              <select className="input" required value={gradeForm.assignment_id}
                onChange={(e) => setGradeForm({ ...gradeForm, assignment_id: e.target.value })}>
                <option value="">-- Select assignment --</option>
                {assignments.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.title} (max: {a.maxScore})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Score</label>
              <input type="number" className="input" required min="0" value={gradeForm.score}
                onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowGradeModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Grade'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
