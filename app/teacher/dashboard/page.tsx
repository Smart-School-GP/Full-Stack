'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import Link from 'next/link'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const user = getUser()

  useEffect(() => {
    api.get('/api/teacher/classes')
      .then((res) => setClasses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 mt-1">Here's an overview of your classes</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card">
            <p className="text-3xl font-bold text-brand-600">{classes.length}</p>
            <p className="text-sm text-slate-500 mt-1">Assigned Classes</p>
          </div>
          <div className="card">
            <p className="text-3xl font-bold text-emerald-600">
              {classes.reduce((sum: number, c: any) => sum + (c._count?.students || 0), 0)}
            </p>
            <p className="text-sm text-slate-500 mt-1">Total Students</p>
          </div>
        </div>

        {/* Classes */}
        <h2 className="font-semibold text-slate-700 mb-4">Your Classes</h2>
        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : classes.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No classes assigned yet. Contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <div className="card hover:shadow-md hover:border-brand-200 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">{cls.name}</h3>
                      {cls.gradeLevel && <p className="text-xs text-slate-400 mt-0.5">Grade {cls.gradeLevel}</p>}
                    </div>
                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20H7m10 0H2v-2a3 3 0 015-2.236M17 20v-2c0-.656-.126-1.283-.356-1.857" />
                      </svg>
                      {cls._count?.students || 0} students
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                      </svg>
                      {cls._count?.subjects || 0} subjects
                    </div>
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
