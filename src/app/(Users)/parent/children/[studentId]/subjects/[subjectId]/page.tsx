'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import api from '@/lib/api'
import Link from 'next/link'

interface AssignmentDetail {
  id: string
  title: string
  type: string
  score: number | null
  max_score: number
  date: string
}

interface SubjectDetail {
  assignments: AssignmentDetail[]
  final_score: number | null
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-slate-300'
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function pct(score: number | null, max: number) {
  if (score === null) return null
  return (score / max) * 100
}

export default function ParentSubjectDetailPage() {
  const { studentId, subjectId } = useParams()
  const [detail, setDetail] = useState<SubjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId || !subjectId) return
    api.get(`/api/parent/children/${studentId}/subjects/${subjectId}/details`)
      .then(r => setDetail(r.data))
      .finally(() => setLoading(false))
  }, [studentId, subjectId])

  const typeGroups = detail?.assignments.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {} as Record<string, AssignmentDetail[]>) || {}

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/parent/children" className="hover:text-brand-500">Children</Link>
          <span>/</span>
          <Link href={`/parent/children/${studentId}`} className="hover:text-brand-500">Student</Link>
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
                      <span className="text-sm text-slate-400">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</span>
                    </div>
                    {typeAvg !== null && (
                      <span className={`text-sm font-semibold ${scoreColor(typeAvg)}`}>
                        Avg: {typeAvg.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left py-2 font-medium text-slate-400">Assignment</th>
                          <th className="text-center py-2 font-medium text-slate-400">Score</th>
                          <th className="text-center py-2 font-medium text-slate-400">Max</th>
                          <th className="text-center py-2 font-medium text-slate-400">Percentage</th>
                          <th className="text-right py-2 font-medium text-slate-400">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(a => {
                          const percentage = pct(a.score, a.max_score)
                          return (
                            <tr key={a.id} className="border-b border-slate-50 last:border-0">
                              <td className="py-3 font-medium text-slate-700">{a.title}</td>
                              <td className="py-3 text-center">
                                {a.score !== null ? (
                                  <span className={`font-semibold ${scoreColor(percentage)}`}>{a.score}</span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="py-3 text-center text-slate-400">{a.max_score}</td>
                              <td className="py-3 text-center">
                                {percentage !== null ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                      />
                                    </div>
                                    <span className={`text-xs font-semibold ${scoreColor(percentage)}`}>{percentage.toFixed(1)}%</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="py-3 text-right text-slate-400 text-xs">
                                {new Date(a.date).toLocaleDateString()}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            {/* Final grade summary */}
            <div className={`card border-2 ${detail.final_score !== null && detail.final_score >= 50 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-700">Final Subject Grade</p>
                  <p className="text-xs text-slate-400 mt-0.5">Calculated from weighted assignment type averages</p>
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
