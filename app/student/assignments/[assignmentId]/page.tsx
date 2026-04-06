'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function StudentAssignmentSubmitPage() {
  const { assignmentId } = useParams()
  const router = useRouter()
  const [assignment, setAssignment] = useState<any>(null)
  const [existingSubmission, setExistingSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [textResponse, setTextResponse] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (assignmentId) loadAssignment()
  }, [assignmentId])

  const loadAssignment = async () => {
    try {
      const [pendingRes, subRes] = await Promise.allSettled([
        api.get('/api/submissions/student/assignments/pending'),
        api.get('/api/submissions/student/submissions'),
      ])

      if (pendingRes.status === 'fulfilled') {
        const found = pendingRes.value.data.find((a: any) => a.id === assignmentId)
        if (found) setAssignment(found)
      }

      if (subRes.status === 'fulfilled') {
        const existing = subRes.value.data.find((s: any) => s.assignmentId === assignmentId)
        if (existing) {
          setExistingSubmission(existing)
          setTextResponse(existing.textResponse || '')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = assignment?.dueDate && new Date(assignment.dueDate) < new Date()

  const canSubmitText = !assignment?.submissionType || ['text', 'both'].includes(assignment.submissionType)
  const canSubmitFile = !assignment?.submissionType || ['file', 'both'].includes(assignment.submissionType)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!textResponse.trim() && !file) {
      setError('Please provide a text response or upload a file.')
      return
    }

    setSubmitting(true)
    try {
      if (file) {
        // File upload path — creates or updates submission with file
        const formData = new FormData()
        formData.append('assignment_id', assignmentId as string)
        formData.append('file', file)
        await api.post('/api/submissions/file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else if (textResponse.trim()) {
        // Text-only path
        await api.post('/api/submissions', {
          assignment_id: assignmentId,
          text_response: textResponse.trim(),
        })
      }

      setSuccess(true)
      setTimeout(() => router.push('/student/assignments'), 1500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!assignment && !existingSubmission) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">Assignment not found.</p>
          <button onClick={() => router.back()} className="btn-primary">Go Back</button>
        </div>
      </div>
    )
  }

  const data = assignment || existingSubmission?.assignment

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/student/assignments')}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Assignments
        </button>

        {/* Assignment Info */}
        <div className="card mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {data?.title || assignment?.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {assignment?.subject?.name} • {assignment?.class?.name}
              </p>
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {assignment?.maxScore} pts
            </span>
          </div>

          {assignment?.dueDate && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {formatDate(assignment.dueDate)}
            </div>
          )}

          {assignment?.instructions && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Instructions</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </div>
          )}
        </div>

        {/* Existing Submission */}
        {existingSubmission && (
          <div className="card mb-6 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-medium text-emerald-800 dark:text-emerald-300">
                Submission Received
              </h3>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                existingSubmission.status === 'graded'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : existingSubmission.status === 'late'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              }`}>
                {existingSubmission.status}
              </span>
            </div>

            {existingSubmission.score !== null && (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                Score: {existingSubmission.score} / {assignment?.maxScore || '—'}
              </p>
            )}

            {existingSubmission.feedback && (
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Feedback:</p>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 bg-white/60 dark:bg-black/20 rounded-lg p-3">
                  {existingSubmission.feedback}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submission Form */}
        {!existingSubmission?.status || existingSubmission.status === 'missing' ? (
          <form onSubmit={handleSubmit} className="card space-y-5">
            <h2 className="font-semibold text-slate-800 dark:text-white">
              {existingSubmission ? 'Update Submission' : 'Submit Your Work'}
            </h2>

            {isOverdue && !existingSubmission && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  This assignment is overdue. Your submission will be marked as late.
                </p>
              </div>
            )}

            {canSubmitText && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Text Response {canSubmitFile ? '(optional)' : ''}
                </label>
                <textarea
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
                />
              </div>
            )}

            {canSubmitFile && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  File Upload {canSubmitText ? '(optional)' : ''}{' '}
                  <span className="text-xs text-slate-400">PDF, DOCX, JPG, PNG — max 10MB</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    file
                      ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10'
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-brand-600 dark:text-brand-400">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null) }}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Click to upload a file</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                {error}
              </p>
            )}

            {success && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Submitted successfully! Redirecting...
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/student/assignments')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || success}
                className="flex-1 btn-primary"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : existingSubmission ? 'Update Submission' : 'Submit Assignment'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
