'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import api from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function SentimentDashboard() {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [sentimentData, setSentimentData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load teacher's classes
    api.get('/api/teacher/classes')
      .then(res => {
        setClasses(res.data)
        if (res.data.length > 0) setSelectedClassId(res.data[0].id)
      })
      .catch(err => setError('Failed to load classes'))
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      setLoading(true)
      setError(null)
      api.get(`/api/sentiment/class/${selectedClassId}`)
        .then(res => setSentimentData(res.data))
        .catch(err => setError('Failed to load sentiment data. Is the AI service running?'))
        .finally(() => setLoading(false))
    }
  }, [selectedClassId])

  if (loading && !sentimentData) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  const COLORS = ['#10b981', '#ef4444', '#64748b'] // Positive, Negative, Neutral

  const pieData = sentimentData ? [
    { name: 'Positive', value: sentimentData.students.reduce((acc: number, s: any) => acc + s.positive_count, 0) },
    { name: 'Negative', value: sentimentData.students.reduce((acc: number, s: any) => acc + s.negative_count, 0) },
    { name: 'Neutral', value: sentimentData.students.reduce((acc: number, s: any) => acc + s.neutral_count, 0) },
  ].filter(d => d.value > 0) : []

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">NLP Sentiment & Engagement</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Analyzing student discussion patterns using AI.</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase px-2">Select Class</span>
              <select 
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-800 dark:text-white"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 rounded-xl text-red-700 dark:text-red-400 mb-8">
              {error}
            </div>
          )}

          {sentimentData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Summary Stats */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card dark:bg-slate-800 border-brand-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Posts Analyzed</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{sentimentData.total_posts}</p>
                </div>
                <div className="card dark:bg-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Sentiment</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-3xl font-black ${
                      sentimentData.overall_sentiment === 'POSITIVE' ? 'text-green-600' : 
                      sentimentData.overall_sentiment === 'NEGATIVE' ? 'text-red-600' : 'text-slate-600'
                    }`}>
                      {sentimentData.overall_sentiment}
                    </span>
                    <span className="text-2xl">
                      {sentimentData.overall_sentiment === 'POSITIVE' ? '😊' : 
                       sentimentData.overall_sentiment === 'NEGATIVE' ? '😟' : '😐'}
                    </span>
                  </div>
                </div>
                <div className="card dark:bg-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Lookback Period</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{sentimentData.lookback_days} Days</p>
                </div>
                <div className="card dark:bg-slate-800 border-amber-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Students At Risk</p>
                  <p className="text-3xl font-black text-amber-600">
                    {sentimentData.students.filter((s: any) => s.avg_sentiment_score < -0.3).length}
                  </p>
                </div>
              </div>

              {/* Chart: Sentiment Distribution */}
              <div className="card lg:col-span-1 dark:bg-slate-800 h-[400px]">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6">Sentiment Breakdown</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Chart: Student Engagement Ranking */}
              <div className="card lg:col-span-2 dark:bg-slate-800 h-[400px]">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6">Student Sentiment Scores (Most Negative to Most Positive)</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={sentimentData.students.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="student_name" tick={{fontSize: 10}} />
                    <YAxis domain={[-1, 1]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '12px' }}
                    />
                    <Bar dataKey="avg_sentiment_score" radius={[4, 4, 0, 0]}>
                      {sentimentData.students.slice(0, 10).map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.avg_sentiment_score < 0 ? '#ef4444' : '#10b981'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table: Detailed Student Insights */}
              <div className="lg:col-span-3 card dark:bg-slate-800 overflow-hidden p-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">Detailed Student Engagement</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Engagement (Posts)</th>
                        <th className="px-6 py-4">Sentiment Score</th>
                        <th className="px-6 py-4">Dominant Tone</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sentimentData.students.map((student: any) => (
                        <tr key={student.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900 dark:text-white">{student.student_name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full flex-1 max-w-[60px]">
                                <div 
                                  className="h-full bg-brand-500 rounded-full" 
                                  style={{ width: `${Math.min((student.post_count / (sentimentData.total_posts / sentimentData.students.length + 1)) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500">{student.post_count}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              student.avg_sentiment_score < -0.3 ? 'bg-red-50 text-red-600' :
                              student.avg_sentiment_score > 0.3 ? 'bg-green-50 text-green-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {student.avg_sentiment_score.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-1.5">
                               <div className={`w-2 h-2 rounded-full ${
                                 student.dominant_sentiment === 'POSITIVE' ? 'bg-green-500' :
                                 student.dominant_sentiment === 'NEGATIVE' ? 'bg-red-500' : 'bg-slate-400'
                               }`} />
                               <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{student.dominant_sentiment}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-brand-600 hover:text-brand-700 text-xs font-bold uppercase tracking-widest">
                              Reach Out
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-12 text-center text-slate-400 text-xs">
            <p>Powered by Advanced Natural Language Processing (DistilBERT SST-2)</p>
            <p className="mt-1">Insights are generated based on student forum activity and discussion engagement.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
