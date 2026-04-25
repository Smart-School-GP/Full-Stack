'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function TeacherAssignmentSubmissionsPage() {
  const params = useParams()
  const assignmentId = params.assignmentId as string
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (assignmentId) loadSubmissions()
  }, [assignmentId])

  const loadSubmissions = () => {
    api.get(`/api/submissions/teacher/assignments/${assignmentId}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleGrade = async () => {
    if (!selectedSubmission) return
    setSaving(true)
    try {
      await api.put(`/api/submissions/${selectedSubmission.id}/feedback`, {
        feedback,
        score: score ? parseFloat(score) : null,
      })
      setSelectedSubmission(null)
      setFeedback('')
      setScore('')
      loadSubmissions()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-700'
      case 'graded':
        return 'bg-emerald-100 text-emerald-700'
      case 'late':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          ← Back
        </button>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : data ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800">{data.assignment?.title}</h1>
              <p className="text-slate-500 mt-1">
                {data.assignment?.subject?.name} • {data.assignment?.subject?.room?.name}
              </p>
              <div className="flex gap-4 mt-2 text-sm text-slate-500">
                <span>Max Score: {data.assignment?.maxScore}</span>
                {data.assignment?.dueDate && (
                  <span>Due: {formatDate(data.assignment.dueDate)}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h2 className="font-semibold text-slate-700 mb-4">
                  Submissions ({data.submissions?.length || 0})
                </h2>
                <div className="space-y-2">
                  {data.submissions?.length === 0 ? (
                    <div className="card text-center py-8 text-slate-400">
                      No submissions yet
                    </div>
                  ) : (
                    data.submissions?.map((sub: any) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubmission(sub)}
                        className={`card cursor-pointer hover:shadow-md ${
                          selectedSubmission?.id === sub.id ? 'border-brand-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800">{sub.student?.name}</p>
                          <span className={`px-2 py-0.5 text-xs rounded ${getStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Submitted: {formatDate(sub.submittedAt)}
                        </p>
                        {sub.score !== null && (
                          <p className="text-sm font-medium text-brand-600 mt-2">
                            Score: {sub.score}/{data.assignment?.maxScore}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedSubmission ? (
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-slate-800">
                        {selectedSubmission.student?.name}'s Submission
                      </h2>
                      <span className={`px-2 py-1 text-sm rounded ${getStatusBadge(selectedSubmission.status)}`}>
                        {selectedSubmission.status}
                      </span>
                    </div>

                    {selectedSubmission.textResponse && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-slate-600 mb-2">Text Response</h3>
                        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                          {selectedSubmission.textResponse}
                        </div>
                      </div>
                    )}

                    {selectedSubmission.fileUrl && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-slate-600 mb-2">File Attachment</h3>
                        <a
                          href={selectedSubmission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-brand-600 hover:underline"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {selectedSubmission.fileName}
                        </a>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-4 mt-4">
                      <h3 className="text-sm font-medium text-slate-600 mb-2">Grade & Feedback</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Score (out of {data.assignment?.maxScore})</label>
                          <input
                            type="number"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            placeholder={selectedSubmission.score?.toString() || ''}
                            min={0}
                            max={data.assignment?.maxScore}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs text-slate-500 mb-1">Feedback</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder={selectedSubmission.feedback || ''}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <button
                        onClick={handleGrade}
                        disabled={saving}
                        className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Feedback'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-12 text-slate-400">
                    Select a submission to view details
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-400">Assignment not found</div>
        )}
      </div>
    </div>
  )
}
