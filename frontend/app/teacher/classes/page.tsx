'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import api from '@/lib/api'

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/teacher/classes')
      .then((res) => setClasses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="p-8">
        <PageHeader title="My Classes" subtitle={`${classes.length} assigned classes`} />
        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <div className="card hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{cls.name}</h3>
                      {cls.gradeLevel && <p className="text-xs text-slate-400 mt-0.5">Grade {cls.gradeLevel}</p>}
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-slate-500">
                    <span>{cls._count?.students || 0} students</span>
                    <span>{cls._count?.subjects || 0} subjects</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
