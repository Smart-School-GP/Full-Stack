'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import XPBar from '@/components/portfolio/XPBar'
import BadgeChip from '@/components/portfolio/BadgeChip'
import { useUserStore } from '@/lib/store/userStore'

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

export default function StudentBadgesPage() {
  const [xpData, setXpData] = useState<XPData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [tab, setTab] = useState<'badges' | 'xp' | 'leaderboard'>('badges')
  const [loading, setLoading] = useState(true)
  const { user } = useUserStore()
  const roomId = user?.room_id || null

  useEffect(() => {
    api.get('/api/xp/me')
      .then((res: any) => setXpData(res.data?.data ?? res.data))
      .catch(() => setXpData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'leaderboard' && roomId) {
      api.get(`/api/xp/leaderboard/${roomId}`)
        .then((r: any) => setLeaderboard(r.data?.data ?? r.data ?? []))
        .catch(console.error)
    }
  }, [tab, roomId])

  if (loading) return (
    <div className="page-container">
      <div className="space-y-6">
        <div className="h-48 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-container max-w-6xl">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 mb-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Level Circle */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white/10 flex items-center justify-center">
              <div className="text-center">
                <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">Level</span>
                <span className="text-5xl font-black text-white leading-none">{xpData?.level || 1}</span>
              </div>
            </div>
            {/* Streak Float */}
            {xpData && xpData.currentStreak > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-bounce">
                <span>🔥</span> {xpData.currentStreak}
              </div>
            )}
          </div>

          {/* XP Details */}
          <div className="flex-1 w-full text-center md:text-left">
            <h1 className="text-3xl font-black mb-2">Adventure Profile</h1>
            <p className="text-slate-400 text-sm mb-6">Continue your learning quest to earn legendary badges!</p>
            
            {xpData && (
              <XPBar
                totalXP={xpData.totalXP}
                level={xpData.level}
                currentXP={xpData.currentXP}
                requiredXP={xpData.requiredXP}
                percentage={xpData.percentage}
                currentStreak={xpData.currentStreak}
              />
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card p-6 border-slate-100 hover:shadow-xl transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            🏅
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Badges Earned</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{xpData?.earnedBadges.length || 0}</p>
        </div>
        <div className="card p-6 border-slate-100 hover:shadow-xl transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Experience</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{xpData?.totalXP.toLocaleString() || 0} XP</p>
        </div>
        <div className="card p-6 border-slate-100 hover:shadow-xl transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            🔥
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Best Streak</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{xpData?.longestStreak || 0} Days</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full sm:w-auto shadow-inner">
          {(['badges', 'xp', 'leaderboard'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                tab === t
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md scale-105'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t === 'xp' ? 'Quest Logs' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {tab === 'badges' && (
          <div className="space-y-12">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-brand-500 rounded-full" />
                My Collection
              </h3>
              {xpData?.earnedBadges && xpData.earnedBadges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {xpData.earnedBadges.map((badge) => (
                    <div 
                      key={badge.id} 
                      className="group relative overflow-hidden card p-0 border-slate-100 hover:border-brand-200 hover:shadow-2xl transition-all duration-300"
                    >
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner group-hover:rotate-12 transition-transform duration-500">
                            {badge.iconEmoji || '🏅'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-white truncate">{badge.name}</h4>
                            <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                              {badge.criteriaType || 'Achievement'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
                          {badge.description || 'A mark of your dedication and learning journey.'}
                        </p>
                      </div>
                      <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Earned {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : 'N/A'}
                        </span>
                        {badge.pointsValue && (
                          <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                            +{badge.pointsValue} XP
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-20 border-dashed">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🏜️</div>
                  <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">The Trophy Room is Empty</h4>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">Start completing assignments and participating in discussions to earn your first badges!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'xp' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-amber-500 rounded-full" />
              Recent Achievements
            </h3>
            {xpData?.recentXP && xpData.recentXP.length > 0 ? (
              xpData.recentXP.map((entry, i) => (
                <div key={i} className="flex items-center gap-4 p-4 card hover:translate-x-2 transition-transform border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center font-black">
                    +{entry.amount}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white capitalize">
                      {entry.reason.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(entry.earnedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Confirmed</div>
                </div>
              ))
            ) : (
              <div className="card text-center py-12 text-slate-400">No recent activity recorded.</div>
            )}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-brand-600 rounded-full" />
              Room Champions
            </h3>
            {!roomId ? (
              <div className="card text-center py-12 text-slate-400">You are not currently enrolled in a room.</div>
            ) : leaderboard.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">Waiting for players to join the quest...</div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.student.id}
                    className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${
                      entry.rank === 1 ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-white shadow-lg scale-[1.02]' :
                      entry.rank === 2 ? 'border-slate-200 bg-gradient-to-r from-slate-50 to-white shadow-md' :
                      entry.rank === 3 ? 'border-orange-100 bg-gradient-to-r from-orange-50 to-white shadow-sm' :
                      'border-slate-100 bg-white hover:bg-slate-50'
                    } dark:bg-slate-800 dark:border-slate-700`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                      entry.rank === 1 ? 'bg-amber-400 text-white shadow-[0_0_15px_rgba(251,191,36,0.5)]' :
                      entry.rank === 2 ? 'bg-slate-300 text-white' :
                      entry.rank === 3 ? 'bg-orange-300 text-white' :
                      'bg-slate-100 text-slate-400 text-sm'
                    }`}>
                      {entry.rank}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {entry.student.name}
                        {entry.student.id === user?.id && (
                          <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">You</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{entry.badgeCount} Badges Collected</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-black text-brand-600 dark:text-brand-400">{entry.totalXP.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level {entry.level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

