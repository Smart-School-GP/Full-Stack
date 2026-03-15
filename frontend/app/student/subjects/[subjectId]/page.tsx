'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
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
  if (score === null) return 'text-slate-300'
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-500'
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

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/student/dashboard" className="hover:text-brand-500">My Grades</Link>
          <span>/</span>
          <span className="text-slate-600">Subject Detail</span>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Assignment Breakdown</h1>
          {detail && (
            <div className="text-right">
              <p className="text-sm text-slate-400">Final Grade</p>
              <p className={`text-3xl font-bold ${scoreColor(detail.final_score)}`}>
                {detail.final_score !== null ? `${detail.final_score.toFixed(1)}%` : '—'}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !detail || detail.assignments.length === 0 ? (
          <div className="card text-center text-slate-400 py-12">No assignments yet.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(typeGroups).map(([type, assignments]) => {
              const scored = assignments.filter(a => a.score !== null)
              const typeAvg = scored.length > 0
                ? scored.reduce((sum, a) => sum + pct(a.score, a.max_score)!, 0) / scored.length
                : null

              return (
                <div key={type} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">{type}</span>
                      <span className="text-sm text-slate-400">{assignments.length} item{assignments.length !== 1 ? 's' : ''}</span>
                    </div>
                    {typeAvg !== null && (
                      <span className={`text-sm font-semibold ${scoreColor(typeAvg)}`}>
                        Your avg: {typeAvg.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {assignments.map(a => {
                      const percentage = pct(a.score, a.max_score)
                      return (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div>
                            <p className="font-medium text-slate-700 text-sm">{a.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(a.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            {percentage !== null && (
                              <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            )}
                            <div className="text-right min-w-[80px]">
                              {a.score !== null ? (
                                <>
                                  <span className={`font-bold ${scoreColor(percentage)}`}>{a.score}</span>
                                  <span className="text-slate-400">/{a.max_score}</span>
                                  <p className={`text-xs font-semibold ${scoreColor(percentage)}`}>
                                    {percentage?.toFixed(1)}%
                                  </p>
                                </>
                              ) : (
                                <span className="text-slate-300 text-sm">Not graded</span>
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

            {/* Final grade */}
            <div className={`card border-2 ${detail.final_score !== null && detail.final_score >= 50 ? 'border-emerald-200 bg-emerald-50/50' : detail.final_score !== null ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-700">Final Subject Grade</p>
                  <p className="text-xs text-slate-400 mt-0.5">Weighted across all assignment types</p>
                </div>
                <p className={`text-3xl font-bold ${scoreColor(detail.final_score)}`}>
                  {detail.final_score !== null ? `${detail.final_score.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
