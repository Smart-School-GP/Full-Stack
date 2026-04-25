'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import GradeBadge from '@/components/ui/GradeBadge'
import ExportButtons from '@/components/ui/ExportButtons'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
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

  const performanceColumns = [
    { key: 'class_name', header: 'Class', render: (row: any) => <span className="font-medium text-slate-900 dark:text-white">{row.class_name}</span> },
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

  const exportHeaders = ['Category', 'Class/Student', 'Performance/Details']
  const exportRows: any[] = []

  if (report) {
    report.class_averages.forEach((c: any) => {
      exportRows.push(['Class Performance', c.class_name, `${c.average?.toFixed(1)}% (${c.student_count} students)`])
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
            subtitle="Performance overview across all classes" 
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
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{report.class_averages.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">Active Classes</p>
              </div>
              <div className="card text-center p-6">
                <p className={`text-3xl font-bold ${report.at_risk_students.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {report.at_risk_students.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">At-Risk Students</p>
              </div>
            </div>

            {/* Class Performance Table */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white px-1">Class Performance</h2>
              <div className="card p-0 overflow-hidden bg-transparent border-none shadow-none md:bg-white md:dark:bg-slate-800 md:border md:shadow-sm">
                <ResponsiveTable
                    columns={performanceColumns}
                    data={report.class_averages}
                    keyField="class_id"
                    emptyMessage="No class data available"
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
