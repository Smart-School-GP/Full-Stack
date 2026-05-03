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
  parents: { name: string }[]
  students: { name: string }[]
}

export default function ParentMeetingsPage() {
  const [upcoming, setUpcoming] = useState<Meeting[]>([])
  const [past, setPast] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    api.get('/api/meetings')
      .then((r: any) => {
        const body = r?.data || r
        const data = body?.data || body
        setUpcoming(Array.isArray(data?.upcoming) ? data.upcoming : [])
        setPast(Array.isArray(data?.past) ? data.past : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const list = tab === 'upcoming' ? upcoming : past

  return (
    <DashboardLayout>
      <div className="page-container max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Meetings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Video consultations with your children's teachers.
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Scheduled</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-0.5">{upcoming.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700/30 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">History</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-0.5">{past.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl w-full sm:w-fit mb-8">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 capitalize ${
                tab === t 
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t === 'upcoming' ? `Upcoming` : `Past Archive`}
              <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${tab === t ? 'bg-brand-50 text-brand-600 dark:bg-slate-600 dark:text-slate-300' : 'bg-slate-300/50 dark:bg-slate-700/50'}`}>
                {t === 'upcoming' ? upcoming.length : past.length}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 animate-pulse font-medium">Loading meetings...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-20 px-6 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {tab === 'upcoming' ? 'No scheduled meetings' : 'Meeting archive is empty'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {tab === 'upcoming' 
                ? 'Your children\'s teachers will schedule meetings here. You will be notified when a new meeting is set.' 
                : 'You haven\'t attended any meetings yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {list.map(m => (
              <MeetingCard key={m.id} meeting={m} role="parent" />
            ))}
          </div>
        )}

        {/* Info box for parents */}
        {tab === 'upcoming' && upcoming.length > 0 && (
          <div className="mt-12 p-6 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-2xl flex gap-4 items-start shadow-sm">
            <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white mb-1 tracking-tight">How to join your call</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Click <strong>Join Call</strong> on the meeting card when it's time. The button activates 5 minutes
                before the scheduled start. No downloads required — the video call runs entirely in your browser.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
