'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import api from '@/lib/api'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface SubjectGrade {
  subject_id: string
  name: string
  final_score: number | null
  last_updated: string
}

interface HistoryEntry {
  subject: string
  score: number | null
  date: string
}

interface Child {
  id: string
  name: string
}

interface StudentProfile {
  student: {
    id: string
    name: string
    email: string
    student_number: string
    joined_at: string
    rooms: string[]
    grade_levels: number[]
  }
  performance: {
    overall_average: number | null
    band: 'excellent' | 'good' | 'average' | 'at-risk' | 'no-data'
    subjects_with_grades: number
    total_subjects: number
    highest_subject: { id: string; name: string; score: number } | null
    lowest_subject: { id: string; name: string; score: number } | null
  }
  attendance: {
    total_records: number
    present: number
    late: number
    excused: number
    absent: number
    attendance_rate: number | null
  }
  risk: {
    level: string
    score: number
    trend: string | null
    subject: string | null
    calculated_at: string
  } | null
  grades: SubjectGrade[]
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-slate-300 dark:text-slate-500'
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function scoreBg(score: number | null) {
  if (score === null) return 'bg-slate-50 dark:bg-slate-800/60'
  if (score >= 75) return 'bg-emerald-50 dark:bg-emerald-900/20'
  if (score >= 50) return 'bg-amber-50 dark:bg-amber-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

export default function ParentStudentDetailPage() {
  const { studentId } = useParams()
  const [grades, setGrades] = useState<SubjectGrade[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    Promise.all([
      api.get(`/api/parent/children/${studentId}/profile`),
      api.get(`/api/parent/children/${studentId}/history`),
      api.get('/api/parent/children'),
    ]).then(([profileRes, histRes, childRes]) => {
      setProfile(profileRes.data)
      setGrades(profileRes.data.grades)
      setHistory(histRes.data.history)
      setChildren(childRes.data)
    }).finally(() => setLoading(false))
  }, [studentId])

  const child = children.find(c => c.id === studentId)

  // Build chart data: one entry per unique date, a line per subject
  const subjects = [...new Set(history.map(h => h.subject))]
  const dates = [...new Set(history.map(h => new Date(h.date).toLocaleDateString()))].slice(-10)
  const chartData = dates.map(date => {
    const entry: Record<string, any> = { date }
    subjects.forEach(sub => {
      const match = history.find(h => h.subject === sub && new Date(h.date).toLocaleDateString() === date)
      if (match) entry[sub] = match.score
    })
    return entry
  })

  const COLORS = ['#3b5bdb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const avg = grades.filter(g => g.final_score !== null)
  const overallAvg = avg.length > 0 ? avg.reduce((s, g) => s + g.final_score!, 0) / avg.length : null
  const displayAvg = profile?.performance.overall_average ?? overallAvg

  const performanceBandLabel: Record<NonNullable<StudentProfile['performance']['band']>, string> = {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    'at-risk': 'Needs Support',
    'no-data': 'No Data',
  }

  const riskTone = (level: string) => {
    if (level === 'critical') return 'text-red-600 bg-red-50'
    if (level === 'high') return 'text-orange-600 bg-orange-50'
    if (level === 'medium') return 'text-amber-600 bg-amber-50'
    return 'text-emerald-600 bg-emerald-50'
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/parent/dashboard" className="hover:text-brand-500">Dashboard</Link>
          <span>/</span>
          <Link href="/parent/children" className="hover:text-brand-500">Children</Link>
          <span>/</span>
          <span className="text-slate-600">{child?.name || 'Student'}</span>
        </div>

        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl font-bold text-emerald-600">
            {child?.name?.[0] || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{child?.name || 'Student'}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              Overall average: <span className={`font-semibold ${scoreColor(displayAvg)}`}>
                {displayAvg !== null ? `${displayAvg.toFixed(1)}%` : 'No grades yet'}
              </span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {profile && (
              <div className="card">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Student Information</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">Student Number</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-1">{profile.student.student_number}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Email: {profile.student.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Joined: {new Date(profile.student.joined_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">Class and Grade</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {profile.student.rooms.length > 0 ? profile.student.rooms.join(', ') : 'No class assigned'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Grade level: {profile.student.grade_levels.length > 0 ? profile.student.grade_levels.join(', ') : 'N/A'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">Performance</p>
                    <p className={`text-2xl font-bold mt-1 ${scoreColor(profile.performance.overall_average)}`}>
                      {profile.performance.overall_average !== null
                        ? `${profile.performance.overall_average.toFixed(1)}%`
                        : '—'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {performanceBandLabel[profile.performance.band]} • {profile.performance.subjects_with_grades}/{profile.performance.total_subjects} graded subjects
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <p className="text-xs text-emerald-700 uppercase tracking-wide">Attendance</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">
                      {profile.attendance.attendance_rate !== null
                        ? `${profile.attendance.attendance_rate.toFixed(1)}%`
                        : 'No records'}
                    </p>
                    <p className="text-xs text-emerald-800/80 mt-2">
                      Present {profile.attendance.present}, Late {profile.attendance.late}, Excused {profile.attendance.excused}, Absent {profile.attendance.absent}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
                    <p className="text-xs text-blue-700 uppercase tracking-wide">Grade Highlights</p>
                    <p className="text-xs text-blue-900 dark:text-blue-200 mt-2">
                      Top subject: {profile.performance.highest_subject
                        ? `${profile.performance.highest_subject.name} (${profile.performance.highest_subject.score.toFixed(1)}%)`
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-blue-900 dark:text-blue-200 mt-1">
                      Lowest subject: {profile.performance.lowest_subject
                        ? `${profile.performance.lowest_subject.name} (${profile.performance.lowest_subject.score.toFixed(1)}%)`
                        : 'N/A'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">Risk Snapshot</p>
                    {profile.risk ? (
                      <>
                        <p className="mt-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${riskTone(profile.risk.level)}`}>
                            {profile.risk.level.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          Subject: {profile.risk.subject || 'General'} • Score {profile.risk.score.toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Updated {new Date(profile.risk.calculated_at).toLocaleDateString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">No risk data available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Subject grades */}
            <div className="card">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Subject Grades</h2>
              {grades.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500 text-sm">No grades available yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grades.map(g => (
                    <Link key={g.subject_id} href={`/parent/children/${studentId}/subjects/${g.subject_id}`}
                      className={`p-4 rounded-xl ${scoreBg(g.final_score)} hover:shadow-md transition-all group border border-transparent hover:border-brand-100 dark:hover:border-brand-800`}>
                      <p className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand-600 transition-colors">{g.name}</p>
                      <p className={`text-2xl font-bold mt-1 ${scoreColor(g.final_score)}`}>
                        {g.final_score !== null ? `${g.final_score.toFixed(1)}%` : '—'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Updated {new Date(g.last_updated).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-brand-500 mt-2 group-hover:underline">View details →</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Grade history chart */}
            {chartData.length > 0 && subjects.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Grade History</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                      <Legend />
                      {subjects.map((sub, i) => (
                        <Line
                          key={sub}
                          type="monotone"
                          dataKey={sub}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
