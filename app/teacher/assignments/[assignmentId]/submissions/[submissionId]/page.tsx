'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function SubmissionReviewPage() {
  const { assignmentId, submissionId } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (assignmentId && submissionId) loadData()
  }, [assignmentId, submissionId])

  const loadData = async () => {
    try {
      const res = await api.get(`/api/submissions/teacher/assignments/${assignmentId}`)
      setData(res.data)
      const sub = res.data.submissions?.find((s: any) => s.id === submissionId)
      if (sub) {
        setSubmission(sub)
        setFeedback(sub.feedback || '')
        setScore(sub.score?.toString() || '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!submission) return
    setError('')
    setSaving(true)
    try {
      await api.put(`/api/submissions/${submissionId}/feedback`, {
        feedback: feedback.trim(),
        score: score ? parseFloat(score) : null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save feedback')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const statusColors: Record<string, string> = {
    submitted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    graded: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    late: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    missing: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-slate-400 mb-4">Submission not found.</p>
          <button onClick={() => router.back()} className="btn-primary">Go Back</button>
        </div>
      </div>
    )
  }

  const assignment = data?.assignment
  const maxScore = assignment?.maxScore || 100

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Back nav */}
        <button
          onClick={() => router.push(`/teacher/assignments/${assignmentId}/submissions`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Submissions
        </button>

        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {submission.student?.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {assignment?.title} • {assignment?.subject?.name}
              </p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[submission.status] || statusColors.submitted}`}>
              {submission.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Submitted: {formatDate(submission.submittedAt)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Submission Content */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card">
              <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Submission Content</h2>

              {submission.textResponse ? (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Text Response</p>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {submission.textResponse}
                  </div>
                </div>
              ) : null}

              {submission.fileUrl ? (
                <div className={submission.textResponse ? 'mt-4' : ''}>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">File Attachment</p>
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-brand-100 dark:bg-brand-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-700 dark:text-brand-300 truncate">
                        {submission.fileName || 'Download File'}
                      </p>
                      <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">Click to open</p>
                    </div>
                    <svg className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ) : null}

              {!submission.textResponse && !submission.fileUrl && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No content submitted</p>
                </div>
              )}
            </div>
          </div>

          {/* Grading Panel */}
          <div className="lg:col-span-2">
            <div className="card sticky top-4">
              <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Grade & Feedback</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Score <span className="text-slate-400 font-normal">/ {maxScore}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    min={0}
                    max={maxScore}
                    placeholder={submission.score?.toString() || '—'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                  {score && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      {((parseFloat(score) / maxScore) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write feedback for the student..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : saved ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </span>
                ) : 'Save Feedback'}
              </button>

              {submission.score !== null && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current Score</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {submission.score}
                    <span className="text-sm font-normal text-slate-500"> / {maxScore}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
