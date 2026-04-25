'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import VideoCall from '@/components/meetings/VideoCall'
import api from '@/lib/api'
import Link from 'next/link'

interface Meeting {
  id: string
  scheduledAt: string
  durationMinutes: number
  status: string
  notes?: string
  roomUrl?: string
  teacher: { id: string; name: string }
  parent: { id: string; name: string }
  student: { id: string; name: string }
}

function isJoinable(scheduledAt: string, durationMinutes: number): boolean {
  const start = new Date(scheduledAt).getTime()
  const end = start + durationMinutes * 60 * 1000
  const now = Date.now()
  return now >= start - 5 * 60 * 1000 && now <= end
}

function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(scheduledAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Starting now'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [scheduledAt])

  return <span className="font-mono text-emerald-600 font-semibold text-2xl">{timeLeft}</span>
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-500',
}

export default function ParentMeetingDetailPage() {
  const { meetingId } = useParams()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCall, setShowCall] = useState(false)

  useEffect(() => {
    if (!meetingId) return
    api.get(`/api/meetings/${meetingId}`)
      .then(r => setMeeting(r.data))
      .finally(() => setLoading(false))
  }, [meetingId])

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center p-16">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  if (!meeting) return (
    <DashboardLayout>
      <div className="p-8 text-slate-400">Meeting not found.</div>
    </DashboardLayout>
  )

  const canJoin = isJoinable(meeting.scheduledAt, meeting.durationMinutes) &&
    meeting.status !== 'cancelled' && meeting.status !== 'completed'

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/parent/meetings" className="hover:text-brand-500">Meetings</Link>
          <span>/</span>
          <span className="text-slate-600">With {meeting.teacher.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">Meeting Info</h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[meeting.status] || ''}`}>
                  {meeting.status}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Teacher</p>
                  <p className="font-medium text-slate-700">{meeting.teacher.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Regarding</p>
                  <p className="font-medium text-slate-700">{meeting.student.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">When</p>
                  <p className="font-medium text-slate-700">
                    {new Date(meeting.scheduledAt).toLocaleString(undefined, {
                      weekday: 'long', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Duration</p>
                  <p className="font-medium text-slate-700">{meeting.durationMinutes} minutes</p>
                </div>
                {meeting.notes && (
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Notes from teacher</p>
                    <p className="text-slate-600 leading-relaxed">{meeting.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Join button */}
            {canJoin && meeting.roomUrl && !showCall && (
              <button
                onClick={() => setShowCall(true)}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join Video Call
              </button>
            )}

            {showCall && (
              <button
                onClick={() => setShowCall(false)}
                className="btn-secondary w-full text-sm"
              >
                Close Call
              </button>
            )}
          </div>

          {/* Video / Placeholder */}
          <div className="lg:col-span-2">
            {showCall && meeting.roomUrl ? (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-800">Video Call</h2>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>
                <VideoCall roomUrl={meeting.roomUrl} onLeave={() => setShowCall(false)} />
              </div>
            ) : (
              <div className="card flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>

                {meeting.status === 'scheduled' && !canJoin && (
                  <>
                    <p className="text-lg font-semibold text-slate-700 mb-2">Meeting Scheduled</p>
                    <p className="text-slate-400 text-sm mb-4">The call opens 5 minutes before start time.</p>
                    <Countdown scheduledAt={meeting.scheduledAt} />
                  </>
                )}
                {meeting.status === 'scheduled' && canJoin && (
                  <>
                    <p className="text-lg font-semibold text-slate-700 mb-2">Your meeting is ready!</p>
                    <p className="text-slate-400 text-sm mb-6">Click "Join Video Call" to connect with {meeting.teacher.name}.</p>
                  </>
                )}
                {meeting.status === 'completed' && (
                  <>
                    <p className="text-lg font-semibold text-slate-700 mb-2">Meeting Completed</p>
                    <p className="text-slate-400 text-sm">This meeting has ended.</p>
                  </>
                )}
                {meeting.status === 'cancelled' && (
                  <>
                    <p className="text-lg font-semibold text-red-500 mb-2">Meeting Cancelled</p>
                    <p className="text-slate-400 text-sm">This meeting was cancelled by the teacher.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
