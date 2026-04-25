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
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [xpData, setXpData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/learning-paths/my').catch(() => []),
      api.get('/api/learning-paths/recommendations/my').catch(() => ({ recommendations: [] })),
      api.get('/api/xp/me').catch(() => null),
    ]).then((results) => {
      const pathRes = results[0]
      const recRes = results[1]
      const xpRes = results[2]
      
      setPaths(Array.isArray(pathRes) ? pathRes : [])
      setRecommendations(recRes?.recommendations || [])
      setXpData(xpRes || null)
    }).catch(err => {
      console.error('Learning Paths data fetch failed:', err)
      setPaths([])
      setRecommendations([])
    })
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-container">
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Your Learning Journey</h1>

      {xpData && (
        <div className="card mb-8">
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

      {/* Adaptive Recommendations */}
      {recommendations?.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              AI Recommended for You
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {recommendations.slice(0, 3).map((rec, i) => (
              <Link 
                key={rec.item_id} 
                href={`/student/paths/${rec.path_id}`}
                className="group relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-2xl border border-brand-100 dark:border-brand-900/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
                
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      rec.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
                    }`}>
                      {rec.priority === 'high' ? 'Critical' : 'Personalized'}
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-white mt-1.5 leading-tight">{rec.item_title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{rec.subject_name} • {rec.path_title}</p>
                  </div>
                  <div className="text-xl">
                    {rec.type === 'video' ? '📺' : rec.type === 'quiz' ? '📝' : '📖'}
                  </div>
                </div>
                
                <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                  "{rec.reason}"
                </p>
                
                <div className="mt-4 flex items-center justify-between">
                   <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Start Now</span>
                   <svg className="w-4 h-4 text-brand-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                   </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 mt-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Assigned Paths</h2>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{paths?.length || 0} Modules</span>
      </div>

      {paths.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No paths assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paths.map(path => (
            <Link 
              key={path.id} 
              href={`/student/paths/${path.id}`}
              className="card group hover:border-brand-500 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-brand-50 dark:bg-brand-900/20 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-brand-500 uppercase">+{path.xpReward} XP</span>
              </div>
              
              <h3 className="font-bold text-slate-800 dark:text-white mb-1">{path.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{path.description}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Progress</span>
                  <span>{path.completionPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 rounded-full transition-all duration-500" 
                    style={{ width: `${path.completionPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-right">
                  {path.completedItems} / {path.totalItems} Steps
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
