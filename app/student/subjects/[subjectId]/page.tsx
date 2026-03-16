'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import ExportButtons from '@/components/ui/ExportButtons'
import api from '@/lib/api'
import Link from 'next/link'

interface Assignment {
  id: string
  title: string
  type: string
  score: number | null
  max_score: number
  date: string
}

interface SubjectDetail {
  assignments: Assignment[]
  final_score: number | null
}

function pct(score: number | null, max: number) {
  if (score === null) return null
  return (score / max) * 100
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-slate-300 dark:text-slate-600'
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

export default function StudentSubjectDetailPage() {
  const { subjectId } = useParams()
  const [detail, setDetail] = useState<SubjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subjectId) return
    api.get(`/api/student/subjects/${subjectId}/details`).then(r => setDetail(r.data)).finally(() => setLoading(false))
  }, [subjectId])

  const typeGroups = detail?.assignments.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {} as Record<string, Assignment[]>) || {}

  // Export data setup
  const exportHeaders = ['Assignment', 'Type', 'Score', 'Percentage', 'Date']
  const exportRows = detail?.assignments.map(a => [
    a.title,
    a.type,
    a.score !== null ? `${a.score}/${a.max_score}` : 'Not Graded',
    a.score !== null ? `${pct(a.score, a.max_score)?.toFixed(1)}%` : '-',
    new Date(a.date).toLocaleDateString()
  ]) || []

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors lg:pt-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-6">
          <Link href="/student/dashboard" className="hover:text-brand-500 transition-colors">My Grades</Link>
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-300">Subject Detail</span>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Assignment Breakdown</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Detailed view of your performance in this subject.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {detail && (
                <ExportButtons
                    title={`Subject Breakdown - ${subjectId}`}
                    headers={exportHeaders}
                    rows={exportRows}
                    filename={`grades_${subjectId}_${new Date().toISOString().split('T')[0]}`}
                />
            )}
            {detail && (
                <div className="text-right bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 min-w-[120px]">
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider">Final Grade</p>
                    <p className={`text-3xl font-bold ${scoreColor(detail.final_score)}`}>
                        {detail.final_score !== null ? `${detail.final_score.toFixed(1)}%` : '—'}
                    </p>
                </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !detail || detail.assignments.length === 0 ? (
          <div className="card text-center text-slate-400 dark:text-slate-500 py-20">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No assignments recorded for this subject yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(typeGroups).map(([type, assignments]) => {
              const scored = assignments.filter(a => a.score !== null)
              const typeAvg = scored.length > 0
                ? scored.reduce((sum, a) => sum + pct(a.score, a.max_score)!, 0) / scored.length
                : null

              return (
                <div key={type} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{type}</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{assignments.length} Item{assignments.length !== 1 ? 's' : ''}</span>
                    </div>
                    {typeAvg !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Category Avg:</span>
                        <span className={`text-sm font-bold ${scoreColor(typeAvg)}`}>
                            {typeAvg.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {assignments.map(a => {
                      const percentage = pct(a.score, a.max_score)
                      return (
                        <div key={a.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-brand-100 dark:hover:border-brand-900/30">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{a.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(a.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-4 sm:gap-8">
                            {percentage !== null && (
                              <div className="flex-1 min-w-[100px] hidden lg:block">
                                <div className="flex justify-between text-[10px] mb-1">
                                    <span className="text-slate-400">Progress</span>
                                    <span className={`font-semibold ${scoreColor(percentage)}`}>{percentage.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                    className={`h-full rounded-full ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                              </div>
                            )}
                            <div className="text-right">
                              {a.score !== null ? (
                                <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                  <span className={`text-lg font-bold ${scoreColor(percentage)}`}>{a.score}</span>
                                  <span className="text-slate-400 dark:text-slate-600 text-sm ml-1">/ {a.max_score}</span>
                                  <span className={`block text-[10px] font-bold uppercase tracking-tighter ${scoreColor(percentage)}`}>
                                    {percentage?.toFixed(1)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-xs font-medium uppercase italic">Pending Grade</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Final grade banner */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${detail.final_score !== null && detail.final_score >= 50 ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-900/10' : detail.final_score !== null ? 'border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Subject Final Performance</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Calculated and weighted across all graded categories.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Final Subject Grade</span>
                        <p className={`text-4xl font-black ${scoreColor(detail.final_score)}`}>
                            {detail.final_score !== null ? `${detail.final_score.toFixed(1)}%` : '—'}
                        </p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
