'use client'

import Link from 'next/link'

interface MeetingCardProps {
  meeting: {
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
  role: 'teacher' | 'parent'
  onCancel?: (id: string) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Live Now',  color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-500' },
}

function isJoinable(scheduledAt: string, durationMinutes: number): boolean {
  const start = new Date(scheduledAt).getTime()
  const end = start + durationMinutes * 60 * 1000
  const now = Date.now()
  // Allow joining 5 min early
  return now >= start - 5 * 60 * 1000 && now <= end
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const diff = new Date(scheduledAt).getTime() - Date.now()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) {
    const days = Math.floor(h / 24)
    return <span className="text-xs text-slate-400">in {days} day{days > 1 ? 's' : ''}</span>
  }
  return <span className="text-xs text-slate-400">in {h > 0 ? `${h}h ` : ''}{m}m</span>
}

export default function MeetingCard({ meeting: m, role, onCancel }: MeetingCardProps) {
  const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.scheduled
  const canJoin = isJoinable(m.scheduledAt, m.durationMinutes) && m.status !== 'cancelled'
  const detailHref = `/${role}/meetings/${m.id}`

  return (
    <div className={`card transition-shadow hover:shadow-md ${m.status === 'cancelled' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
              {status.label}
            </span>
            {canJoin && m.status !== 'cancelled' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 animate-pulse">
                🔴 Live
              </span>
            )}
          </div>
          <p className="font-semibold text-slate-800">
            Re: {m.student.name}
          </p>
        </div>
        <Countdown scheduledAt={m.scheduledAt} />
      </div>

      <div className="text-sm text-slate-500 space-y-1 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDateTime(m.scheduledAt)} · {m.durationMinutes} min
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {role === 'teacher' ? `Parent: ${m.parent.name}` : `Teacher: ${m.teacher.name}`}
        </div>
        {m.notes && (
          <div className="flex items-start gap-2 mt-1">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="line-clamp-2">{m.notes}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {canJoin && m.roomUrl ? (
          <Link href={detailHref} className="btn-primary flex-1 text-center text-sm py-2">
            Join Call
          </Link>
        ) : (
          <Link href={detailHref} className="btn-secondary flex-1 text-center text-sm py-2">
            View Details
          </Link>
        )}
        {role === 'teacher' && m.status === 'scheduled' && onCancel && (
          <button
            onClick={() => onCancel(m.id)}
            className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
