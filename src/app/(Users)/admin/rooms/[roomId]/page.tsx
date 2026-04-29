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

interface Announcement {
  id: string
  title: string
  body: string
  category: string
  createdAt: string
  creatorName: string
}

interface TimetableSlot {
  id: string
  dayOfWeek: number
  subjectName: string
  teacherName: string
  periodName: string
  startTime: string
  endTime: string
}

interface Subject {
  id: string
  name: string
  teacherName: string | null
  assignmentCount: number
  pathCount: number
}

interface RoomData {
  id: string
  name: string
  gradeLevel: number | null
  students: Student[]
  teachers: Teacher[]
  subjects: Subject[]
  announcements: Announcement[]
  timetable: TimetableSlot[]
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
          <Link href="/admin/rooms" className="text-brand-600 hover:underline font-bold uppercase tracking-widest text-xs">Back to Rooms</Link>
        </div>
      </DashboardLayout>
    )
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-6 uppercase tracking-widest">
          <Link href="/admin/rooms" className="hover:text-brand-500 transition-colors">Rooms</Link>
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          <span className="text-slate-800 dark:text-slate-200">{data.name}</span>
        </div>

        {/* Hero Section */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 dark:border-slate-700 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">{data.name}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  {data.gradeLevel && (
                    <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold uppercase tracking-tighter rounded-md border border-brand-100 dark:border-brand-800/30">
                      Grade {data.gradeLevel}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" /></svg>
                    {data.students.length} Students
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.print()} className="btn-secondary py-2 text-xs flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H9v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" /></svg>
                Print Info
              </button>
              <Link href="/admin/rooms" className="btn-primary py-2 text-xs bg-slate-800 hover:bg-slate-900 border-none">
                Manage Room Settings
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timetable Section */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-brand-500 rounded-full" />
                  Weekly Timetable
                </h2>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Schedule</span>
                </div>
              </div>
              
              <div className="overflow-x-auto -mx-6 md:-mx-0">
                <div className="min-w-[600px] px-6 md:px-0 grid grid-cols-7 gap-3">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <div key={day} className="space-y-3">
                      <div className="text-center py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{days[day].slice(0, 3)}</p>
                      </div>
                      <div className="space-y-2">
                        {data.timetable.filter(s => s.dayOfWeek === day).length === 0 ? (
                          <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl">
                             <span className="text-[8px] text-slate-300 font-bold uppercase">Free</span>
                          </div>
                        ) : (
                          data.timetable.filter(s => s.dayOfWeek === day)
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))
                            .map((slot) => (
                              <div key={slot.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:border-brand-300 transition-colors">
                                <p className="text-[9px] font-bold text-brand-600 mb-1">{slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight mb-1">{slot.subjectName}</p>
                                <p className="text-[9px] text-slate-400 truncate">{slot.teacherName}</p>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Students & Subjects Tabs Area (Simplified for now into sections) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Students List */}
                <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                        Enrolled Students
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{data.students.length}</span>
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-[400px] overflow-y-auto">
                    {data.students.length === 0 ? (
                      <p className="p-10 text-center text-slate-400 italic text-xs">No students yet.</p>
                    ) : (
                      data.students.map((s) => (
                        <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-500">
                              {s.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{s.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                            </div>
                          </div>
                          <Link href={`/admin/users/${s.id}`} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors group">
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Subjects Stats */}
                <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                        Room Curriculum
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{data.subjects.length}</span>
                    </h2>
                  </div>
                  <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {data.subjects.length === 0 ? (
                      <p className="p-10 text-center text-slate-400 italic text-xs">No subjects yet.</p>
                    ) : (
                      data.subjects.map((subj) => (
                        <div key={subj.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 group hover:border-brand-200 transition-colors">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{subj.name}</h3>
                          <div className="flex items-center gap-4 text-[10px] text-slate-500">
                             <span className="flex items-center gap-1">
                               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                               {subj.teacherName || 'Unassigned'}
                             </span>
                             <span className="flex items-center gap-1">
                               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                               {subj.assignmentCount} Tasks
                             </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Announcements Feed */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-indigo-400" />
                <h2 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center justify-between">
                    Announcements
                    <span className="px-2 py-0.5 bg-brand-500 text-white rounded text-[8px] font-black uppercase tracking-widest">Feed</span>
                </h2>
                <div className="space-y-6">
                    {data.announcements.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-slate-300 dark:text-slate-600 italic text-xs">No recent announcements for this room.</p>
                        </div>
                    ) : (
                        data.announcements.map((a) => (
                            <div key={a.id} className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-brand-500 before:rounded-full after:content-[''] after:absolute after:left-[3px] after:top-4 after:bottom-[-20px] after:w-[2px] after:bg-slate-100 dark:after:bg-slate-700 last:after:hidden">
                                <p className="text-[10px] font-bold text-slate-400 mb-1">{new Date(a.createdAt).toLocaleDateString()} • {a.creatorName}</p>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight mb-1">{a.title}</h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{a.body}</p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Faculty Section */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
              <h2 className="font-bold text-slate-800 dark:text-white mb-5 text-sm uppercase tracking-widest flex items-center gap-2">
                 <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 Room Faculty
              </h2>
              <div className="space-y-4">
                {data.teachers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No assigned teachers.</p>
                ) : (
                  data.teachers.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {t.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.email}</p>
                      </div>
                      <Link href={`/admin/users/${t.id}`} className="text-slate-300 hover:text-emerald-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Quick Actions Card */}
            <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl" />
              <h3 className="text-xl font-black mb-2 italic">ADMIN PANEL</h3>
              <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">Modify this room's structure, including student rosters and teacher assignments, from the central management board.</p>
              <Link href="/admin/rooms" className="flex items-center justify-between group px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                <span>Go to Management</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
