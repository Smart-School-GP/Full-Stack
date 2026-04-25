'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import Link from 'next/link'

interface FinalGrade {
  id: string
  subjectId: string
  finalScore: number | null
  updatedAt: string
  subject: { id: string; name: string; room: { name: string } }
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-slate-400'
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function gradeLetter(score: number | null) {
  if (score === null) return '—'
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 65) return 'C+'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function gradeLetterColor(score: number | null) {
  if (score === null) return 'bg-slate-100 text-slate-400'
  if (score >= 75) return 'bg-emerald-100 text-emerald-700'
  if (score >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [grades, setGrades] = useState<FinalGrade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ success: boolean; data: FinalGrade[] }>('/api/student/grades')
      .then((r: any) => setGrades(Array.isArray(r) ? r : r?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const scored = grades.filter(g => g.finalScore !== null)
  const overallAvg = scored.length > 0
    ? scored.reduce((sum, g) => sum + g.finalScore!, 0) / scored.length
    : null

  const passing = scored.filter(g => g.finalScore! >= 50).length
  const failing = scored.filter(g => g.finalScore! < 50).length

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">My Grades</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-slate-500">Overall Average</p>
          <p className={`text-3xl font-bold mt-1 ${scoreColor(overallAvg)}`}>
            {overallAvg !== null ? `${overallAvg.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Subjects Passing</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{passing}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Subjects Failing</p>
          <p className={`text-3xl font-bold mt-1 ${failing > 0 ? 'text-red-500' : 'text-slate-300'}`}>{failing}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grades.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          No grades yet. Check back once your teacher has entered grades.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Subject Grades</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {grades.map(g => (
              <Link key={g.id} href={`/student/subjects/${g.subjectId}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${gradeLetterColor(g.finalScore)}`}>
                    {gradeLetter(g.finalScore)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{g.subject.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{g.subject.room.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-xl font-bold ${scoreColor(g.finalScore)}`}>
                      {g.finalScore !== null ? `${g.finalScore.toFixed(1)}%` : '—'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Updated {new Date(g.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Average footer */}
          {overallAvg !== null && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Overall Average</span>
              <span className={`text-lg font-bold ${scoreColor(overallAvg)}`}>{overallAvg.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
