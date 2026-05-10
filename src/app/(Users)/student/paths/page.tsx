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
      api.get('/api/learning-paths/my').catch(() => ({ data: [] })),
      api.get('/api/learning-paths/recommendations/my').catch(() => ({ data: { recommendations: [] } })),
      api.get('/api/xp/me').catch(() => ({ data: null })),
    ]).then((results: any[]) => {
      const pathRes = results[0]
      const recRes = results[1]
      const xpRes = results[2]
      
      const pathData = pathRes.data?.data ?? pathRes.data
      const recData = recRes.data?.data ?? recRes.data
      const xpData = xpRes.data?.data ?? xpRes.data

      setPaths(Array.isArray(pathData) ? pathData : [])
      setRecommendations(recData?.recommendations || [])
      setXpData(xpData || null)
    }).catch(err => {
      console.error('Learning Paths data fetch failed:', err)
      setPaths([])
      setRecommendations([])
    })
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-container max-w-6xl">
      <div className="space-y-8">
        <div className="h-64 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-[2.5rem]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 card animate-pulse bg-slate-100 dark:bg-slate-800 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  )

  const subjectColors: Record<string, string> = {
    'Mathematics': 'from-blue-500 to-indigo-600',
    'Science': 'from-emerald-500 to-teal-600',
    'History': 'from-amber-500 to-orange-600',
    'English': 'from-purple-500 to-pink-600',
    'Art': 'from-rose-500 to-red-600',
    'Music': 'from-violet-500 to-purple-600',
  }

  return (
    <div className="page-container max-w-6xl">
      {/* Header & Level Info */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Learning Academy</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Master new skills and unlock your potential.</p>
        </div>
        
        {xpData && (
          <div className="w-full md:w-80 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
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
      </div>

      {/* Discovery / AI Recommendations */}
      {recommendations?.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-lg shadow-sm">🎯</div>
              Tailored For You
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.slice(0, 3).map((rec, i) => (
              <Link 
                key={rec.item_id} 
                href={`/student/paths/${rec.path_id}`}
                className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className={`h-2 rounded-t-3xl bg-gradient-to-r ${subjectColors[rec.subject_name] || 'from-brand-500 to-purple-500'}`} />
                
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm ${
                      rec.priority === 'high' ? 'bg-red-500 text-white' : 'bg-brand-500 text-white'
                    }`}>
                      {rec.priority === 'high' ? 'Priority' : 'Personal'}
                    </span>
                    <span className="text-xl bg-slate-50 dark:bg-slate-900 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      {rec.type === 'video' ? '🎬' : rec.type === 'quiz' ? '✍️' : '📖'}
                    </span>
                  </div>
                  
                  <h3 className="font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-brand-600 transition-colors">
                    {rec.item_title}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${subjectColors[rec.subject_name] || 'bg-brand-500'}`} />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">
                      {rec.subject_name} • {rec.path_title}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 italic mb-4">
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">"{rec.reason}"</p>
                  </div>
                </div>

                <div className="p-6 pt-0 mt-auto">
                  <div className="flex items-center justify-between py-3 border-t border-slate-50 dark:border-slate-700">
                     <span className="text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest group-hover:gap-2 flex items-center transition-all">
                       Continue Quest
                     </span>
                     <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 group-hover:translate-x-1 transition-all shadow-sm">
                       →
                     </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main Course Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-lg shadow-sm">📚</div>
            Active Courses
          </h2>
          <div className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-inner">
            {paths?.length || 0} Total
          </div>
        </div>

        {paths.length === 0 ? (
          <div className="card text-center py-20 border-dashed rounded-[3rem] bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl">☁️</div>
            <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Clear Skies Ahead</h4>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">You don't have any assigned paths right now. Enjoy the break or ask your teacher for a challenge!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {paths.map(path => (
              <Link 
                key={path.id} 
                href={`/student/paths/${path.id}`}
                className="group flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${subjectColors[path.subject?.name || ''] || 'from-brand-500 to-purple-500'} text-white shadow-lg group-hover:rotate-12 transition-transform`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Potential</span>
                      <span className="text-sm font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full shadow-inner">
                        +{path.xpReward || 50} XP
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 transition-colors">{path.title}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {(path.subject?.name || 'General')} • {path.totalItems} Steps
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                    {path.description || "Embark on this learning path to master core concepts and advance your expertise in this subject."}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{path.completionPercentage}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {path.completedItems} <span className="text-slate-300">/</span> {path.totalItems}
                        </p>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 shadow-inner">
                      <div 
                        className={`h-full bg-gradient-to-r ${subjectColors[path.subject?.name || ''] || 'from-brand-500 to-purple-500'} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--brand-primary),0.3)]`} 
                        style={{ width: `${path.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {path.completionPercentage === 100 ? '✅ Completed' : '🚀 In Progress'}
                  </span>
                  <span className="text-xs font-black text-brand-600 group-hover:translate-x-2 transition-transform">
                    Enter Path →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

