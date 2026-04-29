'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import SchoolSummaryCard from '@/components/analytics/SchoolSummaryCard'
import AtRiskSummaryCard from '@/components/analytics/AtRiskSummaryCard'
import RecommendedActions from '@/components/analytics/RecommendedActions'
import SchoolPerformanceChart from '@/components/analytics/SchoolPerformanceChart'
import SubjectInsightCard from '@/components/analytics/SubjectInsightCard'
import ExportButtons from '@/components/ui/ExportButtons'
import api from '@/lib/api'
import Link from 'next/link'

interface Report {
  id: string
  generated_at: string
  week_start: string
  report_type: string
  school_summary: string | null
  at_risk_summary: string | null
  recommended_actions: string[]
  subject_insights: {
    subject_id: string
    room_id: string
    room_name: string
    subject_name: string
    insight_text: string
    trend: 'improving' | 'declining' | 'stable'
    average_score: number | null
  }[]
}

interface ChartData {
  labels: string[]
  averages: number[]
  trends: string[]
}

interface RiskOverview {
  high_risk: number
  medium_risk: number
  total_at_risk: number
}

export default function AdminAnalyticsPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [chartData, setChartData] = useState<ChartData>({ labels: [], averages: [], trends: [] })
  const [riskData, setRiskData] = useState<RiskOverview>({ high_risk: 0, medium_risk: 0, total_at_risk: 0 })
  const [loadingReport, setLoadingReport] = useState(true)
  const [loadingChart, setLoadingChart] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)

  // Data for export
  const exportHeaders = ['Metric', 'Value']
  const exportRows = [
    ['Total At Risk', riskData.total_at_risk],
    ['High Risk', riskData.high_risk],
    ['Medium Risk', riskData.medium_risk],
    ['Last Generated', report?.generated_at ? new Date(report.generated_at).toLocaleString() : 'N/A']
  ]

  if (report?.subject_insights) {
    report.subject_insights.forEach(insight => {
        exportRows.push([`${insight.subject_name} (${insight.room_name})`, `${insight.average_score ?? 0}% - ${insight.trend}`])
    })
  }

  const fetchReport = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/analytics/latest')
      setReport(res.data.report)
    } catch {}
    setLoadingReport(false)
  }, [])

  const fetchChart = useCallback(async () => {
    try {
      const [chartRes, riskRes] = await Promise.all([
        api.get('/api/admin/analytics/subjects'),
        api.get('/api/admin/risk-overview'),
      ])
      setChartData(chartRes.data)
      setRiskData(riskRes.data)
    } catch {}
    setLoadingChart(false)
  }, [])

  useEffect(() => {
    fetchReport()
    fetchChart()
  }, [fetchReport, fetchChart])

  // Poll job status when refreshing
  useEffect(() => {
    if (!jobId) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/admin/analytics/jobs/${jobId}`)
        setJobStatus(res.data.status)
        if (res.data.status === 'completed') {
          clearInterval(interval)
          setRefreshing(false)
          setJobId(null)
          setJobStatus(null)
          setLoadingReport(true)
          setLoadingChart(true)
          await fetchReport()
          await fetchChart()
        } else if (res.data.status === 'failed') {
          clearInterval(interval)
          setRefreshing(false)
          setJobId(null)
          setJobStatus('failed')
        }
      } catch {
        clearInterval(interval)
        setRefreshing(false)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId, fetchReport, fetchChart])

  const handleRefresh = async () => {
    setRefreshing(true)
    setJobStatus('processing')
    try {
      const res = await api.post('/api/admin/analytics/refresh')
      setJobId(res.data.job_id)
    } catch {
      setRefreshing(false)
      setJobStatus(null)
      alert('Failed to start report generation.')
    }
  }

  const statusLabel: Record<string, string> = {
    processing: 'Generating report…',
    pending: 'Queued…',
    failed: 'Generation failed. Please try again.',
  }

  return (
    <DashboardLayout>
      <div className="p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">AI Analytics</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Weekly intelligence report — powered by AI.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ExportButtons 
              title={`School AI Analytics Report - ${report?.week_start || ''}`}
              headers={exportHeaders}
              rows={exportRows}
              filename={`ai_analytics_${report?.week_start || 'export'}`}
            />
            {jobStatus && (
              <span className={`text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-2
                ${jobStatus === 'failed' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'}`}>
                {jobStatus !== 'failed' && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {statusLabel[jobStatus] || jobStatus}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Generating…' : 'Refresh Report'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group disabled:opacity-50"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${refreshing ? 'bg-slate-100 animate-pulse' : 'bg-brand-50 dark:bg-brand-900/20'} group-hover:scale-110 transition-transform`}>
              <svg className={`w-5 h-5 text-brand-600 dark:text-brand-400 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{refreshing ? 'Refreshing...' : 'Generate Report'}</span>
          </button>

          <Link
            href="/admin/reports"
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Manage Risk</span>
          </Link>

          <Link
            href="/admin/announcements"
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Broadcast AI</span>
          </Link>

          <Link
            href="/admin/dashboard"
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">School Pulse</span>
          </Link>
        </div>

        {/* Week badge */}
        {report && (
          <div className="mb-6 flex items-center gap-3">
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
              Week of {new Date(report.week_start).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Last generated: {new Date(report.generated_at).toLocaleString()}
            </span>
          </div>
        )}

        {/* Section 1 + 3: Summary + At-Risk side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SchoolSummaryCard
            summary={report?.school_summary ?? null}
            generatedAt={report?.generated_at ?? null}
            loading={loadingReport}
          />
          <AtRiskSummaryCard
            summary={report?.at_risk_summary ?? null}
            highRisk={riskData.high_risk}
            mediumRisk={riskData.medium_risk}
            loading={loadingReport}
          />
        </div>

        {/* Section 4: Recommended Actions */}
        <div className="mb-6">
          <RecommendedActions
            actions={report?.recommended_actions ?? []}
            loading={loadingReport}
          />
        </div>

        {/* Section 2: Performance Chart */}
        <div className="mb-6">
          <SchoolPerformanceChart data={chartData} loading={loadingChart} />
        </div>

        {/* Subject Insights Grid */}
        {report?.subject_insights && report.subject_insights.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700 dark:text-slate-200">Subject Insights</h2>
              <Link href="/admin/analytics/subjects" className="text-sm text-brand-500 dark:text-brand-400 hover:underline">
                View all subjects →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {report.subject_insights.slice(0, 6).map((insight, i) => (
                <SubjectInsightCard
                  key={i}
                  subjectName={insight.subject_name}
                  roomName={insight.room_name}
                  averageScore={insight.average_score}
                  trend={insight.trend as any}
                  insightText={insight.insight_text}
                />
              ))}
            </div>
            {report.subject_insights.length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/admin/analytics/subjects" className="btn-secondary text-sm inline-block">
                  View all {report.subject_insights.length} subjects
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loadingReport && !report && (
          <div className="card text-center py-20 mt-6">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Report Generated Yet</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              Generate your first AI analytics report to see school-wide insights, subject trends, and recommended actions.
            </p>
            <button onClick={handleRefresh} disabled={refreshing} className="btn-primary mx-auto">
              Generate First Report
            </button>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              Reports are auto-generated every Sunday at 11pm. You can also trigger a manual refresh at any time.
              When OpenAI is configured, summaries are AI-written; otherwise the system uses built-in rule-based analysis.
              All data is scoped to your school only.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
