'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import BadgeChip from '@/components/portfolio/BadgeChip'

interface LeaderboardEntry {
  rank: number
  student: { id: string; name: string }
  totalXP: number
  level: number
  badgeCount: number
  currentStreak: number
  topBadges?: any[]
}

export default function ClassLeaderboardPage() {
  const { classId } = useParams<{ classId: string }>()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/xp/leaderboard/${classId}`)
      .then((r) => setLeaderboard(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [classId])

  return (
    <div className="page-container max-w-2xl">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href="/teacher/classes" className="hover:text-brand-600">Classes</Link>
        <span>›</span>
        <span className="text-slate-600 dark:text-slate-300">XP Leaderboard</span>
      </div>

      <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-6">🏆 Class Leaderboard</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 card animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">🏆</p>
          <p>No XP data yet for this class</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.student.id}
              className={`card flex items-center gap-4 ${
                entry.rank <= 3
                  ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/10 dark:to-transparent'
                  : ''
              }`}
            >
              <div className="w-10 text-center flex-shrink-0">
                <span className="text-xl font-bold">
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-800 dark:text-white text-sm">
                    {entry.student.name}
                  </span>
                  {entry.currentStreak > 0 && (
                    <span className="text-xs text-amber-500">🔥 {entry.currentStreak}</span>
                  )}
                </div>
                {entry.topBadges && entry.topBadges.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {entry.topBadges.slice(0, 3).map((b: any) => (
                      <BadgeChip key={b.id} badge={b} size="sm" />
                    ))}
                    {entry.badgeCount > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">+{entry.badgeCount - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                  {entry.totalXP.toLocaleString()} XP
                </p>
                <p className="text-xs text-slate-400">Level {entry.level} · {entry.badgeCount} badges</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
