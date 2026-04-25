'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import DashboardLayout from '@/components/ui/DashboardLayout'

interface Assignment {
  id: string
  title: string
  type: string
  maxScore: number
  dueDate: string | null
  submissionType: string | null
  instructions: string | null
  subject: { id: string; name: string }
  room: { id: string; name: string }
  submission?: {
    id: string
    status: string
    submittedAt: string
    score: number | null
    feedback: string | null
  } | null
}

export default function StudentAssignmentsPage() {
  const [pending, setPending] = useState<Assignment[]>([])
  const [completed, setCompleted] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [pendingRes, subRes] = await Promise.all([
        api.get('/api/submissions/student/assignments/pending').catch(() => []),
        api.get('/api/submissions/student/submissions').catch(() => []),
      ])
      
      setPending(Array.isArray(pendingRes) ? pendingRes : [])
      
      // Transform submissions back to "Assignment" like objects for display
      const completedList = Array.isArray(subRes) 
        ? subRes.map((s: any) => ({
            ...s.assignment,
            submission: {
              id: s.id,
              status: s.status,
              submittedAt: s.submittedAt,
              score: s.score,
              feedback: s.feedback,
            }
          }))
        : []
      setCompleted(completedList)
    } catch (err) {
      console.error('Failed to load assignments:', err)
      setPending([])
      setCompleted([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const isOverdue = (dueDate: string | null) => {
    return dueDate && new Date(dueDate) < new Date()
  }

  const filteredItems = ((activeTab === 'pending' ? pending : completed) || []).filter(a => 
    a && a.title && (
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Assignments</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your academic tasks and track your progress</p>
        </div>

        {/* Tabs and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              To Do ({pending.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Finished ({completed.length})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search assignments or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 card animate-pulse bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-slate-800 dark:text-white font-bold">No assignments found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {searchQuery ? 'Try adjusting your search' : activeTab === 'pending' ? 'Great job! You have no pending tasks.' : 'You haven\'t completed any assignments yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((assignment) => {
              const overdue = isOverdue(assignment.dueDate) && activeTab === 'pending'
              const status = assignment.submission?.status || (overdue ? 'overdue' : 'pending')
              
              return (
                <Link
                  key={assignment.id}
                  href={`/student/assignments/${assignment.id}`}
                  className="group block bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          status === 'graded' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                          status === 'submitted' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                          status === 'overdue' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {assignment.type || 'Homework'}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {assignment.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {assignment.subject.name} • {assignment.room.name}
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2">
                      <div className="text-right">
                        {activeTab === 'pending' ? (
                          <div className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
                            {assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : 'No deadline'}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Submitted {formatDate(assignment.submission!.submittedAt)}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Worth {assignment.maxScore} XP
                        </div>
                      </div>

                      {status === 'graded' && (
                        <div className="bg-brand-500 dark:bg-brand-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                          {assignment.submission?.score} / {assignment.maxScore}
                        </div>
                      )}
                    </div>
                  </div>

                  {assignment.instructions && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 line-clamp-2 italic">
                      {assignment.instructions}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {assignment.submissionType === 'file' ? '📁 File Only' : 
                       assignment.submissionType === 'text' ? '✍️ Text Only' : '📝 Multi-mode'}
                    </span>
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      {activeTab === 'pending' ? 'View & Submit' : 'View Submission'}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
