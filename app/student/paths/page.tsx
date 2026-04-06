'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import XPBar from '@/components/portfolio/XPBar'

interface LearningPath {
  id: string
  title: string
  description?: string
  isPublished: boolean
  subject?: { name: string }
  totalItems: number
  completedItems: number
  completionPercentage: number
  xpReward: number
}

export default function StudentPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [xpData, setXpData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/learning-paths/my'),
      api.get('/api/xp/me').catch(() => ({ data: null })),
    ]).then(([pathRes, xpRes]) => {
      setPaths(pathRes.data)
      setXpData(xpRes.data)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-container max-w-3xl">
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-container max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Learning Paths</h1>

      {xpData && (
        <div className="card mb-6">
          <XPBar
            totalXP={xpData.totalXP}
            level={xpData.level}
            currentXP={xpData.currentXP}
            requiredXP={xpData.requiredXP}
            percentage={xpData.percentage}
            currentStreak={xpData.currentStreak}
            compact
          />
        </div>
      )}

      {paths.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-slate-500 dark:text-slate-400">No learning paths assigned yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => (
            <Link
              key={path.id}
              href={`/student/paths/${path.id}`}
              className="card flex items-center gap-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{path.title}</h3>
                  {path.completionPercentage === 100 && <span className="text-emerald-500 text-sm">✅</span>}
                </div>
                {path.subject && (
                  <p className="text-xs text-slate-400 mb-2">{path.subject.name}</p>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${path.completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {path.completedItems}/{path.totalItems}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xl font-bold text-slate-700 dark:text-slate-300">{path.completionPercentage}%</span>
                {path.xpReward > 0 && (
                  <p className="text-[10px] text-amber-500 mt-1">+{path.xpReward} XP</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
