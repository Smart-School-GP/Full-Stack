'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import GradeBadge from '@/components/ui/GradeBadge'
import Link from 'next/link'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'

export default function ParentDashboard() {
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const user = getUser()

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
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 mt-1">Track your children's academic progress</p>
        </div>

        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : children.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No children linked to your account. Contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.map((child) => {
              const avg = getOverallAvg(child)
              const classes = child.studentClasses?.map((sc: any) => sc.class?.name).join(', ')
              return (
                <Link key={child.id} href={`/parent/children/${child.id}`}>
                  <div className="card hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold">
                          {child.name[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{child.name}</h3>
                          {classes && <p className="text-sm text-slate-400 mt-0.5">{classes}</p>}
                        </div>
                      </div>
                      <GradeBadge score={avg} showLabel size="lg" />
                    </div>

                    {child.finalGrades?.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subjects</p>
                        {child.finalGrades.slice(0, 4).map((fg: any) => (
                          <div key={fg.id} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{fg.subject?.name}</span>
                            <GradeBadge score={fg.finalScore} size="sm" />
                          </div>
                        ))}
                        {child.finalGrades.length > 4 && (
                          <p className="text-xs text-slate-400">+{child.finalGrades.length - 4} more subjects</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No grades recorded yet</p>
                    )}
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
