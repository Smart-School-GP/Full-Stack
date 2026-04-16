'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import GradeBadge from '@/components/ui/GradeBadge'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

export default function ParentDashboard() {
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    api.get('/api/parent/children')
      .then((res) => setChildren(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const getOverallAvg = (child: any) => {
    const grades = child.finalGrades?.filter((fg: any) => fg.finalScore !== null)
    if (!grades || grades.length === 0) return null
    return grades.reduce((sum: number, fg: any) => sum + fg.finalScore, 0) / grades.length
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Welcome, {user?.name?.split(' ')[0] || 'Parent'} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track your children's academic performance and daily school activities.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : children.length === 0 ? (
          <div className="card text-center py-20 dark:bg-slate-800 dark:border-slate-700">
            <p className="text-slate-400 dark:text-slate-500">No children linked to your account. Contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {children.map((child) => {
              const avg = getOverallAvg(child)
              const classes = child.studentClasses?.map((sc: any) => sc.class?.name).join(', ')
              return (
                <Link key={child.id} href={`/parent/children/${child.id}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
                            {child.name[0]}
                            </div>
                            <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-xl group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{child.name}</h3>
                            {classes && (
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                    {classes}
                                </p>
                            )}
                            </div>
                        </div>
                        <div className="flex flex-col items-center sm:items-end">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Overall Avg</span>
                            <GradeBadge score={avg} showLabel size="lg" />
                        </div>
                    </div>

                    {child.finalGrades?.length > 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                             <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent Subject Performance</p>
                             <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Current Term</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                            {child.finalGrades.slice(0, 6).map((fg: any) => (
                            <div key={fg.id} className="flex items-center justify-between text-sm transition-transform hover:translate-x-1">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">{fg.subject?.name}</span>
                                <GradeBadge score={fg.finalScore} size="sm" />
                            </div>
                            ))}
                        </div>
                        {child.finalGrades.length > 6 && (
                          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-4 italic">+ {child.finalGrades.length - 6} more subjects available</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No academic results recorded yet</p>
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-center">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest border-b border-brand-200 dark:border-brand-900 pb-0.5">View Detailed Profile</span>
                    </div>
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
