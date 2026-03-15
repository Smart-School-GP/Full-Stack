'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import api from '@/lib/api'
import Link from 'next/link'

export default function AdminDashboard() {
  const [report, setReport] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [reportRes, usersRes, classesRes] = await Promise.all([
          api.get('/api/admin/reports/school'),
          api.get('/api/admin/users'),
          api.get('/api/admin/classes'),
        ])
        setReport(reportRes.data)
        setUsers(usersRes.data)
        setClasses(classesRes.data)
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
      <div className="p-8 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">School-wide overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Students"
            value={report?.total_students ?? 0}
            color="blue"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          />
          <StatCard
            title="Teachers"
            value={roleCount('teacher')}
            color="purple"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          />
          <StatCard
            title="Classes"
            value={classes.length}
            color="green"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          />
          <StatCard
            title="At-Risk Students"
            value={report?.at_risk_students?.length ?? 0}
            subtitle="Score below 50%"
            color="red"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Class Averages */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700">Class Performance</h2>
              <Link href="/admin/classes" className="text-xs text-brand-500 hover:underline">View all →</Link>
            </div>
            {report?.class_averages?.length > 0 ? (
              <div className="space-y-3">
                {report.class_averages.map((cls: any) => (
                  <div key={cls.class_id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{cls.class_name}</p>
                      <p className="text-xs text-slate-400">{cls.student_count} students</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cls.average !== null ? (
                        <>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${cls.average >= 75 ? 'bg-emerald-400' : cls.average >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(cls.average, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-600 w-12 text-right">
                            {cls.average.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">No grades yet</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No classes yet</p>
            )}
          </div>

          {/* At-Risk Students */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700">At-Risk Students</h2>
              <Link href="/admin/reports" className="text-xs text-brand-500 hover:underline">Full report →</Link>
            </div>
            {report?.at_risk_students?.length > 0 ? (
              <div className="space-y-3">
                {report.at_risk_students.slice(0, 5).map((item: any) => (
                  <div key={item.student.id} className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.student.name}</p>
                      <p className="text-xs text-red-500">
                        Failing: {item.failing_subjects.map((s: any) => s.subject).join(', ')}
                      </p>
                    </div>
                    <span className="badge bg-red-100 text-red-700">At Risk</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">No at-risk students</p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card lg:col-span-2">
            <h2 className="font-semibold text-slate-700 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Add User', href: '/admin/users', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { label: 'Create Class', href: '/admin/classes', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                { label: 'Manage Classes', href: '/admin/classes', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                { label: 'View Reports', href: '/admin/reports', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className={`p-4 rounded-xl text-center text-sm font-medium transition-colors ${item.color}`}>
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
