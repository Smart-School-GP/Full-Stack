'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import SubjectInsightCard from '@/components/analytics/SubjectInsightCard'
import SchoolPerformanceChart from '@/components/analytics/SchoolPerformanceChart'
import api from '@/lib/api'
import Link from 'next/link'

interface SubjectItem {
  subject_name: string
  room_name: string
  insight_text: string
  average_score: number | null
  trend: 'improving' | 'declining' | 'stable'
}

interface ChartData {
  labels: string[]
  averages: number[]
  trends: string[]
  insights: SubjectItem[]
}

export default function AdminAnalyticsSubjectsPage() {
  const [data, setData] = useState<ChartData>({ labels: [], averages: [], trends: [], insights: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'improving' | 'declining' | 'stable'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/api/admin/analytics/subjects')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = data.insights.filter(s => {
    const matchTrend = filter === 'all' || s.trend === filter
    const matchSearch = s.subject_name.toLowerCase().includes(search.toLowerCase()) ||
      s.room_name.toLowerCase().includes(search.toLowerCase())
    return matchTrend && matchSearch
  })

  const counts = {
    improving: data.insights.filter(s => s.trend === 'improving').length,
    declining: data.insights.filter(s => s.trend === 'declining').length,
    stable: data.insights.filter(s => s.trend === 'stable').length,
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/admin/analytics" className="hover:text-brand-500">Analytics</Link>
          <span>/</span>
          <span className="text-slate-600">All Subjects</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Subject Performance</h1>
          <p className="text-slate-500 mt-1">
            Detailed breakdown of every subject across all rooms.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-xs text-slate-400 mb-1">Improving</p>
            <p className="text-2xl font-bold text-emerald-600">{counts.improving}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-400 mb-1">Stable</p>
            <p className="text-2xl font-bold text-slate-500">{counts.stable}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-400 mb-1">Declining</p>
            <p className="text-2xl font-bold text-red-500">{counts.declining}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6">
          <SchoolPerformanceChart
            data={{ labels: data.labels, averages: data.averages, trends: data.trends }}
            loading={loading}
          />
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            className="input flex-1"
            placeholder="Search subject or room…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'improving', 'declining', 'stable'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'all' ? `All (${data.insights.length})` :
                 f === 'improving' ? `▲ Improving (${counts.improving})` :
                 f === 'declining' ? `▼ Declining (${counts.declining})` :
                 `→ Stable (${counts.stable})`}
              </button>
            ))}
          </div>
        </div>

        {/* Subject cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-5/6 mt-1" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16 text-slate-400">
            <p className="font-medium">
              {data.insights.length === 0
                ? 'No subject data yet. Generate a report first.'
                : 'No subjects match your filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s, i) => (
              <SubjectInsightCard
                key={i}
                subjectName={s.subject_name}
                className={s.room_name}
                averageScore={s.average_score}
                trend={s.trend}
                insightText={s.insight_text}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
