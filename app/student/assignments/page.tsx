'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = () => {
    api.get('/api/submissions/student/assignments/pending')
      .then((res) => setAssignments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const isOverdue = (dueDate: string) => {
    return dueDate && new Date(dueDate) < new Date()
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">My Assignments</h1>
          <p className="text-slate-500 mt-1">View and submit pending assignments</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : assignments.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No pending assignments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`card ${isOverdue(assignment.dueDate) ? 'border-red-300 bg-red-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{assignment.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {assignment.subject?.name} • {assignment.class?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {assignment.dueDate ? (
                      <span className={`text-sm ${isOverdue(assignment.dueDate) ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                        Due: {formatDate(assignment.dueDate)}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">No due date</span>
                    )}
                  </div>
                </div>

                {assignment.instructions && (
                  <p className="text-sm text-slate-600 mt-3">{assignment.instructions}</p>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    Submission type: {assignment.submissionType || 'both'}
                  </span>
                  <a
                    href={`/student/assignments/${assignment.id}`}
                    className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600"
                  >
                    Submit
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
