'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import GradeBadge from '@/components/ui/GradeBadge'
import ExportButtons from '@/components/ui/ExportButtons'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import api from '@/lib/api'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

export default function AdminReportsPage() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadReport = () => {
    setLoading(true)
    api.get('/api/admin/reports/school')
      .then((res) => setReport(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReport()
  }, [])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await api.post('/api/admin/analytics/refresh')
      const res = await api.get('/api/admin/reports/school')
      setReport(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  // Binning logic for Histograms
  const gradeDistribution = report ? [
    { range: '0-50', count: report.room_averages.filter((r: any) => r.average < 50).length, color: '#ef4444' },
    { range: '50-60', count: report.room_averages.filter((r: any) => r.average >= 50 && r.average < 60).length, color: '#f59e0b' },
    { range: '60-70', count: report.room_averages.filter((r: any) => r.average >= 60 && r.average < 70).length, color: '#fbbf24' },
    { range: '70-80', count: report.room_averages.filter((r: any) => r.average >= 70 && r.average < 80).length, color: '#34d399' },
    { range: '80-90', count: report.room_averages.filter((r: any) => r.average >= 80 && r.average < 90).length, color: '#10b981' },
    { range: '90-100', count: report.room_averages.filter((r: any) => r.average >= 90).length, color: '#059669' },
  ] : []

  const roomSizeDistribution = report ? [
    { range: '0-10', count: report.room_averages.filter((r: any) => r.student_count <= 10).length },
    { range: '11-20', count: report.room_averages.filter((r: any) => r.student_count > 10 && r.student_count <= 20).length },
    { range: '21-30', count: report.room_averages.filter((r: any) => r.student_count > 20 && r.student_count <= 30).length },
    { range: '31-40', count: report.room_averages.filter((r: any) => r.student_count > 30 && r.student_count <= 40).length },
    { range: '41+', count: report.room_averages.filter((r: any) => r.student_count > 40).length },
  ] : []

  const performanceColumns = [
    { key: 'room_name', header: 'Room', render: (row: any) => <span className="font-medium text-slate-900 dark:text-white">{row.room_name}</span> },
    { key: 'student_count', header: 'Students', render: (row: any) => <span className="text-slate-500 dark:text-slate-400">{row.student_count}</span> },
    { key: 'average', header: 'Average Grade', render: (row: any) => <GradeBadge score={row.average} showLabel /> },
    {
        key: 'progress',
        header: 'Progress',
        render: (row: any) => (
            row.average !== null ? (
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
                    <div
                        className={`h-full rounded-full ${row.average >= 75 ? 'bg-emerald-400' : row.average >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(row.average, 100)}%` }}
                    />
                    </div>
                </div>
            ) : <span className="text-xs text-slate-400 dark:text-slate-500">No grades yet</span>
        )
    }
  ]

  const atRiskColumns = [
    {
      key: 'student',
      header: 'Student',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-semibold">
            {row.student.name[0]}
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200">{row.student.name}</span>
        </div>
      ),
    },
    {
      key: 'failing_subjects',
      header: 'Failing Subjects',
      render: (row: any) => (
        <div className="flex flex-wrap gap-2">
          {row.failing_subjects.map((s: any, i: number) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-1 rounded-full border border-red-100 dark:border-red-900/30">
              {s.subject}: <strong>{s.score?.toFixed(1)}%</strong>
            </span>
          ))}
        </div>
      ),
    },
  ]

  const exportHeaders = ['Category', 'Room/Student', 'Performance/Details']
  const exportRows: any[] = []

  if (report) {
    report.room_averages.forEach((c: any) => {
      exportRows.push(['Room Performance', c.room_name, `${c.average?.toFixed(1)}% (${c.student_count} students)`])
    })
    report.at_risk_students.forEach((s: any) => {
      exportRows.push(['At-Risk', s.student.name, s.failing_subjects.map((fs: any) => `${fs.subject}: ${fs.score}%`).join(', ')])
    })
  }

  const exportAction = report && (
    <ExportButtons
      title="School Performance Report"
      headers={exportHeaders}
      rows={exportRows}
      filename={`school_performance_report_${new Date().toISOString().split('T')[0]}`}
    />
  )

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <PageHeader 
            title="School Reports" 
            subtitle="Performance overview across all rooms" 
            action={exportAction}
        />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="card text-center p-6">
                <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">{report.total_students}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">Total Students</p>
              </div>
              <div className="card text-center p-6">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{report.room_averages.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">Active Rooms</p>
              </div>
              <div className="card text-center p-6">
                <p className={`text-3xl font-bold ${report.at_risk_students.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {report.at_risk_students.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">At-Risk Students</p>
              </div>
            </div>

            {/* Performance Distribution Histograms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6 dark:bg-slate-800">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Grade Distribution (Rooms)</h3>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                      <XAxis dataKey="range" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(0,0,0,0.05)'}}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-6 dark:bg-slate-800">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Room Size Distribution</h3>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roomSizeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                      <XAxis dataKey="range" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(0,0,0,0.05)'}}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white px-1">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group disabled:opacity-50"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${refreshing ? 'bg-slate-100 animate-pulse' : 'bg-brand-50 dark:bg-brand-900/20'} group-hover:scale-110 transition-transform`}>
                    <svg className={`w-6 h-6 text-brand-600 dark:text-brand-400 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Analytics Sync</span>
                </button>

                <Link
                  href="/admin/announcements"
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Broadcast</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">New Announcement</span>
                </Link>

                <Link
                  href="/admin/users"
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Manage Users</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Staff & Students</span>
                </Link>

                <Link
                  href="/admin/rooms"
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Rooms</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Room Overview</span>
                </Link>
              </div>
            </div>

            {/* Room Performance Table */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white px-1">Room Performance</h2>
              <div className="card p-0 overflow-hidden bg-transparent border-none shadow-none md:bg-white md:dark:bg-slate-800 md:border md:shadow-sm">
                <ResponsiveTable
                    columns={performanceColumns}
                    data={report.room_averages}
                    keyField="room_id"
                    emptyMessage="No room data available"
                />
              </div>
            </div>

            {/* At-Risk Students */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">At-Risk Students (Score &lt; 50%)</h2>
              </div>
              
              <div className="card p-0 overflow-hidden bg-transparent border-none shadow-none md:bg-white md:dark:bg-slate-800 md:border md:shadow-sm">
                <ResponsiveTable
                    columns={atRiskColumns}
                    data={report.at_risk_students}
                    keyField="student.id"
                    emptyMessage="No at-risk students — great performance!"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
