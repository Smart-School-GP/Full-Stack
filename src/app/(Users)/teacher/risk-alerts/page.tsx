'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import RiskBadge from '@/components/ui/RiskBadge'
import api from '@/lib/api'
import Link from 'next/link'
import StudentInfoModal from '@/components/students/StudentInfoModal'

interface FeatureContribution {
  feature: string
  label: string
  value: number
  contribution: number
  normalized: number
  direction: 'risk' | 'protective'
}

interface Alert {
  student_id: string
  student_name: string
  subject_id: string
  subject_name: string
  risk_score: number
  risk_level: 'high' | 'medium' | 'low'
  trend: 'improving' | 'stable' | 'declining' | null
  confidence: number | null
  current_grade: number | null
  grade_change_7d: number | null
  explanations: FeatureContribution[]
  calculated_at: string
  student: any
}

function formatFeatureValue(feature: string, value: number): string {
  if (feature === 'submission_rate') return `${(value * 100).toFixed(0)}%`
  if (feature === 'days_since_last_grade' || feature === 'assignments_submitted' || feature === 'assignments_total') {
    return Math.round(value).toString()
  }
  if (feature.startsWith('score_change')) {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }
  if (feature === 'score_vs_room_avg') {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}`
  }
  return value.toFixed(1)
}

function RiskFactorBreakdown({ explanations }: { explanations: FeatureContribution[] }) {
  if (!explanations.length) {
    return (
      <div className="text-sm text-slate-400 py-2">
        No explanation data available for this prediction yet.
      </div>
    )
  }
  const maxAbs = Math.max(...explanations.map(e => Math.abs(e.normalized)), 0.0001)

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-700 text-sm">Risk Factor Breakdown</h4>
        <span className="text-[11px] text-slate-400 uppercase tracking-wide">
          Top {explanations.length} contributing features
        </span>
      </div>

      <div className="space-y-2">
        {explanations.map((e) => {
          const pct = (Math.abs(e.normalized) / maxAbs) * 100
          const isRisk = e.direction === 'risk'
          return (
            <div key={e.feature} className="grid grid-cols-[1fr_auto_2fr_auto] gap-3 items-center text-xs">
              <span className="text-slate-700 font-medium truncate">{e.label}</span>
              <span className="text-slate-500 tabular-nums text-right w-20">
                {formatFeatureValue(e.feature, e.value)}
              </span>
              {/* Bipolar bar: protective left, risk right, centered on zero */}
              <div className="relative h-5 bg-slate-100 rounded overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300" aria-hidden="true" />
                {isRisk ? (
                  <div
                    className="absolute left-1/2 top-0 bottom-0 bg-red-400"
                    style={{ width: `${pct / 2}%` }}
                    aria-label={`Risk contribution: ${(e.normalized * 100).toFixed(1)}%`}
                  />
                ) : (
                  <div
                    className="absolute right-1/2 top-0 bottom-0 bg-emerald-400"
                    style={{ width: `${pct / 2}%` }}
                    aria-label={`Protective contribution: ${(Math.abs(e.normalized) * 100).toFixed(1)}%`}
                  />
                )}
              </div>
              <span className={`tabular-nums font-semibold text-right w-14 ${isRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                {isRisk ? '+' : '−'}{(Math.abs(e.normalized) * 100).toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
        Percentages are normalised shares of this student's risk decision. Red
        bars pushed the prediction toward risk; green bars pulled it away.
        Generated via SHAP on the XGBoost roomifier (or rule-based fallback).
      </p>
    </div>
  )
}

function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend || trend === 'stable') return <span className="text-slate-400 text-xs">→ Stable</span>
  if (trend === 'improving') return <span className="text-emerald-600 text-xs font-semibold">▲ Improving</span>
  return <span className="text-red-500 text-xs font-semibold">▼ Declining</span>
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
  const [expanded, setExpanded] = useState<string | null>(null)
  
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)

  const rowKey = (a: Alert) => `${a.student_id}-${a.subject_id}`
  const toggleExpanded = (key: string) =>
    setExpanded((curr) => (curr === key ? null : key))

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
                  <th className="w-10" aria-label="Expand row" />
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Student</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Subject</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Risk</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">AI Trend</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Current Grade</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">7-Day Change</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Updated</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.flatMap((a) => {
                  const key = rowKey(a)
                  const isOpen = expanded === key
                  const rows = [
                      <tr key={key}
                        className={`border-b border-slate-50 last:border-0 transition-colors ${
                          a.risk_level === 'high' ? 'bg-red-50/30' : ''
                        } ${isOpen ? 'bg-slate-50/80' : ''}`}>
                        <td className="px-2 py-4 text-center">
                          <button
                            onClick={() => toggleExpanded(key)}
                            aria-expanded={isOpen}
                            aria-controls={`breakdown-${key}`}
                            aria-label={isOpen ? 'Hide risk factor breakdown' : 'Show risk factor breakdown'}
                            className="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => { setSelectedStudent(a.student); setShowInfoModal(true) }}
                            className="flex items-center gap-2 group text-left"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-transform group-hover:scale-110 ${
                              a.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {a.student_name[0]}
                            </div>
                            <span className="font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{a.student_name}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{a.subject_name}</td>
                        <td className="px-4 py-4 text-center">
                          <RiskBadge level={a.risk_level} score={a.risk_score} showScore />
                          {a.confidence !== null && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{(a.confidence * 100).toFixed(0)}% conf.</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <TrendBadge trend={a.trend} />
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
                      </tr>,
                  ]
                  if (isOpen) {
                    rows.push(
                      <tr key={`${key}-breakdown`} className="bg-slate-50/60 border-b border-slate-100">
                        <td colSpan={9} className="px-8 pb-4" id={`breakdown-${key}`}>
                          <RiskFactorBreakdown explanations={a.explanations} />
                        </td>
                      </tr>
                    )
                  }
                  return rows
                })}
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
            <strong> Medium risk (40–65%)</strong> should be monitored closely. Expand any row (▶) to see
            the <strong>Risk Factor Breakdown</strong> — SHAP-based explanations showing exactly which
            features pushed this student's prediction toward or away from risk.
          </p>
        </div>

        <StudentInfoModal 
          isOpen={showInfoModal}
          onClose={() => { setShowInfoModal(false); setSelectedStudent(null) }}
          student={selectedStudent}
        />
      </div>
    </DashboardLayout>
  )
}
