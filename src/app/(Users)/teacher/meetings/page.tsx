'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import MeetingCard from '@/components/meetings/MeetingCard'
import api from '@/lib/api'
import Link from 'next/link'

interface Meeting {
  id: string
  scheduledAt: string
  durationMinutes: number
  status: string
  notes?: string
  roomUrl?: string
  teacher: { name: string }
  parent: { name: string }
  student: { name: string }
}

export default function TeacherMeetingsPage() {
  const [upcoming, setUpcoming] = useState<Meeting[]>([])
  const [past, setPast] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  const fetchMeetings = () => {
    setLoading(true)
    api.get('/api/meetings')
      .then(r => { setUpcoming(r.data.upcoming); setPast(r.data.past) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMeetings() }, [])

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this meeting? The parent will be notified.')) return
    try {
      await api.put(`/api/meetings/${id}/cancel`)
      fetchMeetings()
    } catch {
      alert('Failed to cancel meeting.')
    }
  }

  const list = tab === 'upcoming' ? upcoming : past

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Meetings</h1>
            <p className="text-slate-500 mt-1">Schedule and manage parent–teacher video calls.</p>
          </div>
          <Link href="/teacher/meetings/new" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Schedule Meeting
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-slate-500">Upcoming</p>
            <p className="text-3xl font-bold text-brand-600 mt-1">{upcoming.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-3xl font-bold text-slate-600 mt-1">
              {past.filter(m => m.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center p-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="card text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="font-medium text-slate-500">
              {tab === 'upcoming' ? 'No upcoming meetings.' : 'No past meetings.'}
            </p>
            {tab === 'upcoming' && (
              <Link href="/teacher/meetings/new" className="mt-4 inline-block btn-primary text-sm">
                Schedule your first meeting
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(m => (
              <MeetingCard key={m.id} meeting={m} role="teacher" onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
