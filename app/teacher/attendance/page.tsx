'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    api.get('/api/teacher/classes')
      .then((res) => setClasses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalStudents = classes.reduce((sum: number, c: any) => sum + (c._count?.students || 0), 0)

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Attendance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {user?.name?.split(' ')[0] ? `${user.name.split(' ')[0]}, ` : ''}mark and review attendance across {classes.length} {classes.length === 1 ? 'class' : 'classes'} ({totalStudents} students).
          </p>
        </div>

        {/* Classes */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Select a Class</h2>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mark Attendance</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="card text-center py-20 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-slate-400 dark:text-slate-500">No classes assigned yet. Contact your administrator.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Link key={cls.id} href={`/teacher/attendance/${cls.id}`}>
                  <div className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center font-bold text-lg">
                        {cls.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors uppercase tracking-tight">{cls.name}</h3>
                        {cls.gradeLevel && (
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grade {cls.gradeLevel}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-2">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Students</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{cls._count?.students || 0}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Subjects</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{cls._count?.subjects || 0}</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Mark Attendance</span>
                      <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
