'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import api from '@/lib/api'
import Link from 'next/link'

interface Child {
  id: string
  name: string
  email: string
  finalGrades: { finalScore: number | null; subject: { name: string } }[]
  studentRooms: { room: { name: string } }[]
}

function overallAvg(grades: { finalScore: number | null }[]) {
  const scored = grades.filter(g => g.finalScore !== null)
  if (!scored.length) return null
  return scored.reduce((sum, g) => sum + g.finalScore!, 0) / scored.length
}

function scoreRing(avg: number | null) {
  if (avg === null) return { color: 'text-slate-300', bg: 'bg-slate-100', label: 'No grades' }
  if (avg >= 75) return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Good' }
  if (avg >= 50) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Average' }
  return { color: 'text-red-600', bg: 'bg-red-50', label: 'At Risk' }
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/parent/children').then(r => setChildren(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">My Children</h1>
          <p className="text-slate-500 mt-1">View grades and academic progress for each child.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : children.length === 0 ? (
          <div className="card text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            No children linked to your account yet. Contact your school administrator.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map(child => {
              const avg = overallAvg(child.finalGrades)
              const ring = scoreRing(avg)
              const className = child.studentRooms[0]?.room.name

              return (
                <Link key={child.id} href={`/parent/children/${child.id}`}
                  className="card hover:shadow-lg hover:border-brand-200 border border-transparent transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${ring.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-2xl font-bold ${ring.color}`}>{child.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{child.name}</h3>
                      {className && <p className="text-xs text-slate-400 mt-0.5">{className}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-400">Overall Average</p>
                      <p className={`text-2xl font-bold mt-0.5 ${ring.color}`}>
                        {avg !== null ? `${avg.toFixed(1)}%` : '—'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ring.bg} ${ring.color}`}>
                      {ring.label}
                    </span>
                  </div>

                  {child.finalGrades.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-50">
                      {child.finalGrades.slice(0, 3).map((fg, i) => {
                        const r = scoreRing(fg.finalScore)
                        return (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 truncate">{fg.subject.name}</span>
                            <span className={`text-xs font-semibold ${r.color}`}>
                              {fg.finalScore !== null ? `${fg.finalScore.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        )
                      })}
                      {child.finalGrades.length > 3 && (
                        <p className="text-xs text-slate-400 text-right">+{child.finalGrades.length - 3} more subjects</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{child.finalGrades.length} subjects</span>
                    <span className="text-brand-500 text-xs font-medium group-hover:underline">View details →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
