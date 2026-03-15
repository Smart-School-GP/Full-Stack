'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import RiskBadge from '@/components/ui/RiskBadge'
import api from '@/lib/api'
import Link from 'next/link'

interface Alert {
  student_id: string
  student_name: string
  subject_id: string
  subject_name: string
  risk_score: number
  risk_level: 'high' | 'medium' | 'low'
  current_grade: number | null
  grade_change_7d: number | null
  calculated_at: string
}

function TrendArrow({ change }: { change: number | null }) {
  if (change === null) return <span className="text-slate-300">—</span>
  if (change > 0) return <span className="text-emerald-500 font-semibold">▲ +{change.toFixed(1)}%</span>
  if (change < 0) return <span className="text-red-500 font-semibold">▼ {change.toFixed(1)}%</span>
  return <span className="text-slate-400">→ 0%</span>
}

export default function TeacherRiskAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState('')
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all')

  const fetchAlerts = () => {
    setLoading(true)
    api.get('/api/teacher/risk-alerts')
      .then(r => setAlerts(r.data.alerts))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAlerts() }, [])

  const handleTrigger = async () => {
    setTriggering(true)
    setTriggerMsg('')
    try {
      await api.post('/api/teacher/risk-alerts/trigger')
      setTriggerMsg('Analysis triggered. Refreshing in 5s…')
      setTimeout(() => { fetchAlerts(); setTriggerMsg('') }, 5000)
    } catch {
      setTriggerMsg('Failed to trigger analysis.')
    } finally {
      setTriggering(false)
    }
  }

  const filtered = alerts.filter(a => filter === 'all' || a.risk_level === filter)
  const highCount = alerts.filter(a => a.risk_level === 'high').length
  const medCount = alerts.filter(a => a.risk_level === 'medium').length

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Risk Alerts</h1>
            <p className="text-slate-500 mt-1">
              AI-powered dropout risk scores, updated nightly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {triggerMsg && (
              <span className="text-sm text-slate-500">{triggerMsg}</span>
            )}
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${triggering ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {triggering ? 'Running…' : 'Run Analysis Now'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-slate-500">Total At-Risk</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{alerts.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">High Risk</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{highCount}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Medium Risk</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{medCount}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
          {(['all', 'high', 'medium'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'all' ? `All (${alerts.length})` : f === 'high' ? `High (${highCount})` : `Medium (${medCount})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center p-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700">No {filter !== 'all' ? filter + '-risk' : ''} alerts</p>
            <p className="text-slate-400 text-sm mt-1">
              {alerts.length === 0
                ? 'Run the analysis to generate risk scores.'
                : 'No students match this filter.'}
            </p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Student</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Subject</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Risk</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Current Grade</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">7-Day Trend</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Updated</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={`${a.student_id}-${a.subject_id}`}
                    className={`border-b border-slate-50 last:border-0 ${
                      a.risk_level === 'high' ? 'bg-red-50/30' : ''
                    }`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          a.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {a.student_name[0]}
                        </div>
                        <span className="font-medium text-slate-800">{a.student_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{a.subject_name}</td>
                    <td className="px-4 py-4 text-center">
                      <RiskBadge level={a.risk_level} score={a.risk_score} showScore />
                    </td>
                    <td className="px-4 py-4 text-center">
                      {a.current_grade !== null ? (
                        <span className={`font-semibold ${
                          a.current_grade >= 75 ? 'text-emerald-600' :
                          a.current_grade >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {a.current_grade.toFixed(1)}%
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <TrendArrow change={a.grade_change_7d} />
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 text-xs">
                      {new Date(a.calculated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/teacher/meetings/new?student_id=${a.student_id}`}
                        className="text-xs text-brand-500 hover:underline font-medium"
                      >
                        Schedule Meeting
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <p className="font-semibold mb-1">How risk scores work</p>
          <p className="text-blue-600 leading-relaxed">
            Scores are calculated nightly using an XGBoost model trained on grade trends, submission rates,
            and time since last activity. <strong>High risk (≥65%)</strong> requires immediate attention.
            <strong> Medium risk (40–65%)</strong> should be monitored closely. You can manually trigger
            a re-analysis using the button above.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
