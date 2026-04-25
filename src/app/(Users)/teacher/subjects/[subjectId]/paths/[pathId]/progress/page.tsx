'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

interface StudentProgress {
  studentId: string
  studentName: string
  completedItems: number
  totalItems: number
  percentage: number
  lastActivity?: string
}

export default function PathProgressPage() {
  const { subjectId, pathId } = useParams<{ subjectId: string; pathId: string }>()
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [pathTitle, setPathTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/api/learning-paths/${pathId}/progress`),
      api.get(`/api/learning-paths/${pathId}`),
    ]).then(([progRes, pathRes]) => {
      setProgress(progRes.data)
      setPathTitle(pathRes.data.title)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [pathId])

  const avg = progress.length > 0
    ? Math.round(progress.reduce((s, p) => s + p.percentage, 0) / progress.length)
    : 0

  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href={`/teacher/subjects/${subjectId}/paths`} className="hover:text-brand-600">Paths</Link>
        <span>›</span>
        <span className="text-slate-600 dark:text-slate-300">{pathTitle}</span>
        <span>›</span>
        <span>Progress</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Student Progress</h1>
        {progress.length > 0 && (
          <div className="text-center">
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{avg}%</span>
            <p className="text-xs text-slate-400">room average</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 card animate-pulse bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : progress.length === 0 ? (
        <div className="card text-center py-10 text-slate-400">No student progress yet</div>
      ) : (
        <div className="space-y-2">
          {[...progress].sort((a, b) => b.percentage - a.percentage).map((s) => (
            <div key={s.studentId} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-800 dark:text-white truncate">{s.studentName}</span>
                  <span className="text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                    {s.completedItems}/{s.totalItems}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.percentage === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex-shrink-0 w-12 text-right">
                <span className={`text-sm font-bold ${
                  s.percentage === 100 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {s.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
