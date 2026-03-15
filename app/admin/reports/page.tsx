'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import GradeBadge from '@/components/ui/GradeBadge'
import api from '@/lib/api'

export default function AdminReportsPage() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/reports/school')
      .then((res) => setReport(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="p-8">
        <PageHeader title="School Reports" subtitle="Performance overview across all classes" />

        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-3xl font-bold text-brand-600">{report.total_students}</p>
                <p className="text-sm text-slate-500 mt-1">Total Students</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-emerald-600">{report.class_averages.length}</p>
                <p className="text-sm text-slate-500 mt-1">Active Classes</p>
              </div>
              <div className="card text-center">
                <p className={`text-3xl font-bold ${report.at_risk_students.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {report.at_risk_students.length}
                </p>
                <p className="text-sm text-slate-500 mt-1">At-Risk Students</p>
              </div>
            </div>

            {/* Class Performance Table */}
            <div className="card p-0 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Class Performance</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Class</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Students</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Average Grade</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {report.class_averages.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No class data yet</td></tr>
                  ) : report.class_averages.map((cls: any) => (
                    <tr key={cls.class_id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-700">{cls.class_name}</td>
                      <td className="px-6 py-4 text-slate-500">{cls.student_count}</td>
                      <td className="px-6 py-4">
                        <GradeBadge score={cls.average} showLabel />
                      </td>
                      <td className="px-6 py-4">
                        {cls.average !== null ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                              <div
                                className={`h-full rounded-full ${cls.average >= 75 ? 'bg-emerald-400' : cls.average >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(cls.average, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No grades yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* At-Risk Students */}
            <div className="card p-0 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="font-semibold text-slate-800">At-Risk Students (Score &lt; 50%)</h2>
              </div>
              {report.at_risk_students.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center gap-2 text-emerald-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">No at-risk students — great performance!</span>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Student</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Failing Subjects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {report.at_risk_students.map((item: any) => (
                      <tr key={item.student.id} className="hover:bg-red-50/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-semibold">
                              {item.student.name[0]}
                            </div>
                            <span className="font-medium text-slate-700">{item.student.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {item.failing_subjects.map((s: any, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                                {s.subject}: <strong>{s.score?.toFixed(1)}%</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
