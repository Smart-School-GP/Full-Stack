'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import Link from 'next/link'
import api from '@/lib/api'

interface Student {
  id: string
  name: string
  email: string
}

interface Teacher {
  id: string
  name: string
  email: string
}

interface Subject {
  id: string
  name: string
  teacherName: string | null
}

interface RoomData {
  id: string
  name: string
  gradeLevel: number | null
  students: Student[]
  teachers: Teacher[]
  subjects: Subject[]
}

export default function AdminRoomDetailPage() {
  const { roomId } = useParams()
  const router = useRouter()
  const [data, setData] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/admin/rooms/${roomId}`)
      setData(res.data.data)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error?.message || 'Failed to load room details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (roomId) load()
  }, [roomId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-red-500 font-medium mb-4">{error || 'Room not found'}</p>
          <Link href="/admin/rooms" className="text-brand-600 hover:underline">Back to Rooms</Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-2">
          <Link href="/admin/rooms" className="hover:text-brand-500 transition-colors">Rooms</Link>
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-300 font-medium">{data.name}</span>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{data.name}</h1>
              {data.gradeLevel && (
                <p className="text-slate-500 dark:text-slate-400 mt-1">Grade Level: <span className="font-semibold text-brand-600 dark:text-brand-400">{data.gradeLevel}</span></p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Students</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{data.students.length}</p>
              </div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Teachers</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{data.teachers.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Roster Section */}
          <div className="xl:col-span-2 space-y-8">
            {/* Students */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 dark:text-white">Enrolled Students</h2>
                <span className="text-[10px] font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full uppercase">List</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {data.students.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 dark:text-slate-500 italic text-sm">No students enrolled yet.</p>
                ) : (
                  data.students.map((s) => (
                    <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                          {s.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white text-sm">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </div>
                      </div>
                      <Link href={`/admin/users?search=${encodeURIComponent(s.email)}`} className="text-[10px] font-bold text-brand-600 hover:underline uppercase tracking-widest">View Profile</Link>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Subjects */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 dark:text-white">Curriculum & Subjects</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {data.subjects.length === 0 ? (
                  <p className="col-span-full text-center text-slate-400 dark:text-slate-500 italic text-sm py-4">No subjects defined for this room.</p>
                ) : (
                  data.subjects.map((subj) => (
                    <div key={subj.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{subj.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {subj.teacherName || 'Unassigned'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Teachers Sidebar */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
              <h2 className="font-bold text-slate-800 dark:text-white mb-4">Assigned Teachers</h2>
              <div className="space-y-4">
                {data.teachers.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">No teachers assigned to this room yet.</p>
                ) : (
                  data.teachers.map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {t.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white text-xs truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="bg-brand-500 rounded-3xl p-6 text-white shadow-lg shadow-brand-500/30">
              <h3 className="font-bold mb-2">Need to manage this room?</h3>
              <p className="text-xs text-blue-100 mb-4 opacity-90">Go back to the main Rooms list to enroll students, assign teachers, or manage subject definitions.</p>
              <Link href="/admin/rooms" className="inline-block px-4 py-2 bg-white text-brand-600 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors">
                Manage Rooms →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
