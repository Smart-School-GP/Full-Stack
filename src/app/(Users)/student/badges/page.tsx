'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import XPBar from '@/components/portfolio/XPBar'
import BadgeChip from '@/components/portfolio/BadgeChip'

interface XPData {
  totalXP: number
  level: number
  currentXP: number
  requiredXP: number
  percentage: number
  currentStreak: number
  longestStreak: number
  earnedBadges: Badge[]
  recentXP: { amount: number; reason: string; earnedAt: string }[]
}

interface Badge {
  id: string
  name: string
  description?: string
  iconEmoji?: string
  color?: string
  criteriaType?: string
  pointsValue?: number
  earnedAt?: string
}

interface LeaderboardEntry {
  rank: number
  student: { id: string; name: string }
  totalXP: number
  level: number
  badgeCount: number
}

import { useUserStore } from '@/lib/store/userStore'

export default function StudentBadgesPage() {
  const [xpData, setXpData] = useState<XPData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [tab, setTab] = useState<'badges' | 'xp' | 'leaderboard'>('badges')
  const [loading, setLoading] = useState(true)
  const { user } = useUserStore()
  const classId = user?.class_id || null

  useEffect(() => {
    api.get('/api/xp/me')
      .then((res: any) => setXpData(res))
      .catch(() => setXpData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'leaderboard' && classId) {
      api.get(`/api/xp/leaderboard/${classId}`)
        .then((r) => setLeaderboard(r))
        .catch(console.error)
    }
  }, [tab, classId])

  if (loading) return (
    <div className="page-container">
      <div className="space-y-4">
        <div className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        <div className="h-48 card animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Achievements & XP</h1>

      {xpData && (
        <div className="card mb-6">
          <XPBar
            totalXP={xpData.totalXP}
            level={xpData.level}
            currentXP={xpData.currentXP}
            requiredXP={xpData.requiredXP}
            percentage={xpData.percentage}
            currentStreak={xpData.currentStreak}
          />
          {xpData.longestStreak > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Longest streak: {xpData.longestStreak} days
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit mb-8">
        {(['badges', 'xp', 'leaderboard'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t === 'xp' ? 'History' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'badges' && (
        <div>
          {xpData?.earnedBadges && xpData.earnedBadges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {xpData.earnedBadges.map((badge) => (
                <div key={badge.id} className="card flex items-start gap-3">
                  <BadgeChip badge={badge} size="lg" />
                  <div className="flex-1 min-w-0">
                    {badge.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>
                    )}
                    {badge.earnedAt && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                    {badge.pointsValue && (
                      <p className="text-[10px] text-amber-500">+{badge.pointsValue} XP</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🏅</p>
              <p className="text-slate-500 dark:text-slate-400">No badges earned yet. Keep going!</p>
            </div>
          )}
        </div>
      )}

      {tab === 'xp' && (
        <div className="space-y-2">
          {xpData?.recentXP && xpData.recentXP.length > 0 ? (
            xpData.recentXP.map((entry, i) => (
              <div key={i} className="flex items-center justify-between p-3 card">
                <span className="text-sm text-slate-700 dark:text-slate-300">{entry.reason.replace(/_/g, ' ')}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-amber-500">+{entry.amount} XP</span>
                  <p className="text-[10px] text-slate-400">{new Date(entry.earnedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="card text-center py-8 text-slate-400">No XP history yet</div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div>
          {!classId ? (
            <div className="card text-center py-8 text-slate-400">Not in a class</div>
          ) : leaderboard.length === 0 ? (
            <div className="card text-center py-8 text-slate-400">No leaderboard data yet</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.student.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    entry.rank <= 3
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="w-7 text-center font-bold text-sm text-slate-600 dark:text-slate-400">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{entry.student.name}</p>
                    <p className="text-xs text-slate-400">{entry.badgeCount} badges</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{entry.totalXP.toLocaleString()} XP</p>
                    <p className="text-xs text-slate-400">Level {entry.level}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
