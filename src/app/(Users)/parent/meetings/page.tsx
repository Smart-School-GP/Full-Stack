'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import MeetingCard from '@/components/meetings/MeetingCard'
import api from '@/lib/api'

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

export default function ParentMeetingsPage() {
  const [upcoming, setUpcoming] = useState<Meeting[]>([])
  const [past, setPast] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    api.get('/api/meetings')
      .then(r => { setUpcoming(r.data.upcoming); setPast(r.data.past) })
      .finally(() => setLoading(false))
  }, [])

  const list = tab === 'upcoming' ? upcoming : past

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Meetings</h1>
          <p className="text-slate-500 mt-1">Video calls scheduled by your children's teachers.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-slate-500">Upcoming</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{upcoming.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Past</p>
            <p className="text-3xl font-bold text-slate-400 mt-1">{past.length}</p>
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
          <div className="card text-center py-16">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-slate-500">
              {tab === 'upcoming' ? 'No upcoming meetings.' : 'No past meetings.'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {tab === 'upcoming' && 'Your children\'s teachers will schedule meetings here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(m => (
              <MeetingCard key={m.id} meeting={m} role="parent" />
            ))}
          </div>
        )}

        {/* Info box for parents */}
        {tab === 'upcoming' && upcoming.length > 0 && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
            <p className="font-semibold mb-1">📹 How to join</p>
            <p className="text-emerald-600">
              Click <strong>Join Call</strong> on a meeting card when it's time. The button activates 5 minutes
              before the scheduled start. No downloads needed — the video call runs entirely in your browser.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
