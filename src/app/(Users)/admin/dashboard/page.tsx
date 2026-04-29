'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import api from '@/lib/api'
import Link from 'next/link'

export default function AdminDashboard() {
  const [report, setReport] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [reportRes, usersRes, roomsRes] = await Promise.all([
          api.get('/api/admin/reports/school'),
          api.get('/api/admin/users'),
          api.get('/api/admin/rooms'),
        ])
        setReport(reportRes.data)
        setUsers(usersRes.data)
        setRooms(roomsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const roleCount = (role: string) => users.filter((u) => u.role === role).length

  if (loading) return (
    <DashboardLayout>
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Comprehensive school-wide performance and management overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Students"
            value={report?.total_students ?? 0}
            color="blue"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          />
          <StatCard
            title="Faculty Members"
            value={roleCount('teacher')}
            color="purple"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          />
          <StatCard
            title="Active Rooms"
            value={rooms.length}
            color="green"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          />
          <StatCard
            title="At-Risk Students"
            value={report?.at_risk_students?.length ?? 0}
            subtitle="Current score below 50%"
            color="red"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Room Averages */}
          <div className="card dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs">Room Performance</h2>
              <Link href="/admin/rooms" className="text-xs text-brand-500 dark:text-brand-400 font-bold hover:underline">View all →</Link>
            </div>
            {report?.room_averages?.length > 0 ? (
              <div className="space-y-5">
                {report.room_averages.map((cls: any) => (
                  <div key={cls.room_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-[120px]">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{cls.room_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium">{cls.student_count} students</p>
                    </div>
                    <div className="flex items-center gap-3 flex-1 sm:max-w-xs">
                      {cls.average !== null ? (
                        <>
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${cls.average >= 75 ? 'bg-emerald-400' : cls.average >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(cls.average, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-black w-12 text-right ${cls.average >= 75 ? 'text-emerald-500' : cls.average >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {cls.average.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600 italic">No grades recorded</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 dark:text-slate-600">No room performance data available.</div>
            )}
          </div>

          {/* At-Risk Students */}
          <div className="card dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs">At-Risk Students</h2>
              <Link href="/admin/reports" className="text-xs text-brand-500 dark:text-brand-400 font-bold hover:underline">Full report →</Link>
            </div>
            {report?.at_risk_students?.length > 0 ? (
              <div className="space-y-4">
                {report.at_risk_students.slice(0, 5).map((item: any) => (
                  <div key={item.student.id} className="flex items-start justify-between bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-50 dark:border-slate-700/50 hover:border-red-100 dark:hover:border-red-900/30 transition-all">
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.student.name}</p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 line-clamp-1">
                        Failing: {item.failing_subjects.map((s: any) => s.subject).join(', ')}
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest border border-red-100 dark:border-red-900/30">
                        At Risk
                    </span>
                  </div>
                ))}
                {report.at_risk_students.length > 5 && (
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 italic mt-2">+ {report.at_risk_students.length - 5} more at-risk students</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-emerald-600 dark:text-emerald-400 gap-3">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-sm font-bold uppercase tracking-widest">Excellent Status: No at-risk students</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card dark:bg-slate-800 dark:border-slate-700 lg:col-span-2">
            <h2 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs mb-6 px-1">Management Shortcuts</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Add User', href: '/admin/users', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30' },
                { label: 'Create Room', href: '/admin/rooms', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30' },
                { label: 'Create Announcements', href: '/admin/announcements', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30' },
                { label: 'View Analytics', href: '/admin/analytics', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className={`p-4 rounded-2xl text-center text-sm font-bold transition-all hover:scale-105 ${item.color} border border-transparent hover:border-current`}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
