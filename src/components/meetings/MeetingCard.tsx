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
    parents: { name: string }[]
    students: { name: string }[]
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

  const studentNames = m.students.map(s => s.name).join(', ')
  const parentNames = m.parents.map(p => p.name).join(', ')

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${m.status === 'cancelled' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
      <div className="flex items-start justify-between mb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-lg ${status.color}`}>
              {status.label}
            </span>
            {canJoin && m.status !== 'cancelled' && (
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-lg bg-emerald-500 text-white animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                Live
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-brand-600 transition-colors">
            {m.students.length > 1 ? 'Group Consultation' : `Consultation: ${m.students[0]?.name}`}
          </h3>
          {m.students.length > 1 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{studentNames}</p>
          )}
        </div>
        <div className="flex flex-col items-end">
          <Countdown scheduledAt={m.scheduledAt} />
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDateTime(m.scheduledAt)}</p>
            <p className="text-xs">{m.durationMinutes} minutes session</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {role === 'teacher' ? 'Parents Involved' : 'Teacher Assigned'}
            </p>
            <p className="text-xs line-clamp-1">{role === 'teacher' ? parentNames : m.teacher.name}</p>
          </div>
        </div>

        {m.notes && (
          <div className="flex items-start gap-3 text-slate-500 dark:text-slate-400 pt-1">
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm line-clamp-2 italic leading-relaxed">
              "{m.notes}"
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-auto">
        {canJoin && m.roomUrl ? (
          <Link href={detailHref} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-2xl text-center text-sm shadow-lg shadow-brand-500/25 transition-all active:scale-[0.98]">
            Join Meeting Now
          </Link>
        ) : (
          <Link href={detailHref} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-2xl text-center text-sm transition-all active:scale-[0.98]">
            View Details
          </Link>
        )}
        {role === 'teacher' && m.status === 'scheduled' && onCancel && (
          <button
            onClick={() => onCancel(m.id)}
            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
            title="Cancel Meeting"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
