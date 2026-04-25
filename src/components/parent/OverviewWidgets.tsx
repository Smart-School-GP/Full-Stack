'use client'

import Link from 'next/link'

export interface ParentOverview {
  children: { id: string; name: string }[]
  todayAttendance: {
    childId: string
    childName: string
    status: 'present' | 'absent' | 'late' | 'excused' | 'no-record' | string
    recordCount: number
  }[]
  upcomingWork: {
    id: string
    assignmentId: string
    title: string
    type: string
    dueDate: string | null
    subject: { id: string; name: string }
    class: { id: string; name: string }
    child: { id: string; name: string }
    submitted: boolean
    submissionStatus: string | null
  }[]
  announcements: {
    id: string
    title: string
    body: string
    category: string
    pinned: boolean
    createdAt: string
    creator?: { id: string; name: string } | null
    subject?: { id: string; name: string } | null
  }[]
  events: {
    id: string
    title: string
    eventType: string
    startDate: string
    endDate: string
    color?: string | null
  }[]
  riskAlerts: {
    id: string
    riskLevel: 'high' | 'critical' | string
    riskScore: number
    trend?: string | null
    calculatedAt: string
    subject: { id: string; name: string }
    student: { id: string; name: string }
  }[]
  unreadMessages: number
}

const ATTENDANCE_STYLES: Record<
  string,
  { label: string; dot: string; pill: string; icon: string }
> = {
  present: {
    label: 'Present',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40',
    icon: '✓',
  },
  late: {
    label: 'Late',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-900/40',
    icon: '⏱',
  },
  excused: {
    label: 'Excused',
    dot: 'bg-sky-500',
    pill: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-100 dark:border-sky-900/40',
    icon: 'ℹ',
  },
  absent: {
    label: 'Absent',
    dot: 'bg-red-500',
    pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-900/40',
    icon: '✗',
  },
  'no-record': {
    label: 'Not marked',
    dot: 'bg-slate-300 dark:bg-slate-600',
    pill: 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-100 dark:border-slate-700',
    icon: '—',
  },
}

function getAttendanceStyle(status: string) {
  return ATTENDANCE_STYLES[status] ?? ATTENDANCE_STYLES['no-record']
}

const TYPE_STYLES: Record<string, { label: string; pill: string }> = {
  exam: {
    label: 'Exam',
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  quiz: {
    label: 'Quiz',
    pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  homework: {
    label: 'Homework',
    pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  project: {
    label: 'Project',
    pill: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  participation: {
    label: 'Participation',
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
}

function getTypeStyle(type: string) {
  return (
    TYPE_STYLES[type?.toLowerCase()] ?? {
      label: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Task',
      pill: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    }
  )
}

function relativeDays(iso: string | null): string {
  if (!iso) return 'No due date'
  const due = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfDue = new Date(due)
  startOfDue.setHours(0, 0, 0, 0)
  const diffDays = Math.round(
    (startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays < 7) return `Due in ${diffDays}d`
  return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function dayBadge(iso: string): { day: string; month: string } {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString(undefined, { day: '2-digit' }),
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
  }
}

/* ------------------------------------------------------------------ */
/* Stats strip                                                         */
/* ------------------------------------------------------------------ */
export function StatsStrip({ overview }: { overview: ParentOverview }) {
  const absentCount = overview.todayAttendance.filter((a) => a.status === 'absent').length
  const examsSoon = overview.upcomingWork.filter((w) => w.type?.toLowerCase() === 'exam').length

  const items = [
    {
      label: 'Children',
      value: overview.children.length,
      tone: 'text-slate-800 dark:text-white',
    },
    {
      label: 'Absences today',
      value: absentCount,
      tone: absentCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500',
    },
    {
      label: 'Upcoming items',
      value: overview.upcomingWork.length,
      tone: 'text-slate-800 dark:text-white',
    },
    {
      label: 'Exams in 14d',
      value: examsSoon,
      tone: examsSoon > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500',
    },
    {
      label: 'Risk alerts',
      value: overview.riskAlerts.length,
      tone:
        overview.riskAlerts.length > 0
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-slate-400 dark:text-slate-500',
    },
    {
      label: 'Unread messages',
      value: overview.unreadMessages,
      tone:
        overview.unreadMessages > 0
          ? 'text-brand-600 dark:text-brand-400'
          : 'text-slate-400 dark:text-slate-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-sm"
        >
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {it.label}
          </p>
          <p className={`text-2xl font-bold mt-1 ${it.tone}`}>{it.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Today's attendance                                                  */
/* ------------------------------------------------------------------ */
export function TodayAttendanceWidget({
  rows,
}: {
  rows: ParentOverview['todayAttendance']
}) {
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-white">
          Today at school
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No children linked yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const s = getAttendanceStyle(r.status)
            return (
              <li
                key={r.childId}
                className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {r.childName}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.pill}`}
                >
                  <span aria-hidden>{s.icon}</span>
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Upcoming homework / exams                                           */
/* ------------------------------------------------------------------ */
export function UpcomingWorkWidget({
  items,
}: {
  items: ParentOverview['upcomingWork']
}) {
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-white">
          Upcoming homework & exams
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">Next 14 days</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Nothing on the schedule. Enjoy the calm.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {items.map((w) => {
            const t = getTypeStyle(w.type)
            const badge = w.dueDate ? dayBadge(w.dueDate) : null
            const overdue =
              w.dueDate && new Date(w.dueDate).getTime() < Date.now() && !w.submitted
            return (
              <li
                key={w.id}
                className="py-3 flex items-start gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 -mx-2 px-2 rounded-lg transition-colors"
              >
                {badge && (
                  <div
                    className={`flex-shrink-0 w-12 text-center rounded-lg border ${
                      overdue
                        ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-300'
                        : 'bg-slate-50 border-slate-100 text-slate-700 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <p className="text-[10px] font-bold tracking-wider pt-1">{badge.month}</p>
                    <p className="text-lg font-black leading-none pb-1">{badge.day}</p>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${t.pill}`}>
                      {t.label}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {w.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {w.child.name} · {w.subject.name} · {w.class.name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-xs font-semibold ${
                      overdue
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {relativeDays(w.dueDate)}
                  </p>
                  {w.submitted ? (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                      Submitted
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Not submitted
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */
export function AnnouncementsWidget({
  items,
}: {
  items: ParentOverview['announcements']
}) {
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-white">
          Latest announcements
        </h2>
        <Link
          href="/parent/announcements"
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          View all →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No announcements right now.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60 hover:border-brand-200 dark:hover:border-brand-800 transition-colors"
            >
              <div className="w-1 self-stretch rounded-full bg-brand-400 dark:bg-brand-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.pinned && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Pinned
                    </span>
                  )}
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {a.title}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {a.body}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                  {a.creator?.name ?? 'School'} ·{' '}
                  {new Date(a.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {a.subject ? ` · ${a.subject.name}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Upcoming events                                                     */
/* ------------------------------------------------------------------ */
export function EventsWidget({ items }: { items: ParentOverview['events'] }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-white">
          Upcoming events
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">Next 14 days</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No school events scheduled.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => {
            const badge = dayBadge(e.startDate)
            return (
              <li key={e.id} className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 w-12 text-center rounded-lg border border-slate-100 dark:border-slate-700"
                  style={
                    e.color
                      ? { backgroundColor: `${e.color}15`, borderColor: `${e.color}40` }
                      : undefined
                  }
                >
                  <p className="text-[10px] font-bold tracking-wider pt-1 text-slate-600 dark:text-slate-300">
                    {badge.month}
                  </p>
                  <p
                    className="text-lg font-black leading-none pb-1"
                    style={e.color ? { color: e.color } : undefined}
                  >
                    {badge.day}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {e.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {e.eventType.replace(/_/g, ' ')}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Risk alerts                                                         */
/* ------------------------------------------------------------------ */
export function RiskAlertsWidget({
  items,
}: {
  items: ParentOverview['riskAlerts']
}) {
  if (items.length === 0) return null
  return (
    <section className="card border-l-4 border-amber-400 dark:border-amber-500">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800 dark:text-white">
          Subjects to keep an eye on
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
          {items.length} alert{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((r) => {
          const isCritical = r.riskLevel === 'critical'
          return (
            <li
              key={r.id}
              className={`p-3 rounded-lg border ${
                isCritical
                  ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/40'
                  : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    isCritical
                      ? 'text-red-600 dark:text-red-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {r.riskLevel}
                </p>
                {r.trend && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                    {r.trend}
                  </span>
                )}
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate">
                {r.student.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                {r.subject.name}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Absence banner — surfaced above all widgets                         */
/* ------------------------------------------------------------------ */
export function AbsenceBanner({
  rows,
}: {
  rows: ParentOverview['todayAttendance']
}) {
  const absent = rows.filter((r) => r.status === 'absent')
  if (absent.length === 0) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 mb-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20"
    >
      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-300 font-bold flex-shrink-0">
        !
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-red-800 dark:text-red-200">
          {absent.length === 1
            ? `${absent[0].childName} was marked absent today`
            : `${absent.length} of your children were marked absent today`}
        </p>
        <p className="text-sm text-red-700 dark:text-red-300/80 mt-0.5">
          {absent.map((a) => a.childName).join(', ')}. If this is unexpected, contact
          the school or the class teacher.
        </p>
      </div>
    </div>
  )
}
