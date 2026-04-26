'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import AnnouncementForm from '@/components/announcements/AnnouncementForm'

type Audience = 'all' | 'teachers' | 'parents' | 'students' | 'subject' | 'room' | 'custom'

interface Announcement {
  id: string
  title: string
  body: string
  audience: Audience
  category: string
  pinned: boolean
  expiresAt: string | null
  createdAt: string
  createdBy: string
  isRead: boolean
  isMine: boolean
  creator?: { id: string; name: string; role: string }
  subject?: { id: string; name: string } | null
  room?: { id: string; name: string } | null
  _count?: { reads: number; recipients: number }
}

const AUDIENCE_TONE: Record<Audience, string> = {
  all: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  teachers: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  parents: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  students: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  subject: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  room: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200',
  custom: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
}

function audienceLabel(a: Announcement): string {
  switch (a.audience) {
    case 'all': return 'Everyone'
    case 'teachers': return 'All teachers'
    case 'parents': return 'All parents'
    case 'students': return 'All students'
    case 'subject': return a.subject ? `Subject · ${a.subject.name}` : 'Subject'
    case 'room': return a.room ? `Class · ${a.room.name}` : 'Class'
    case 'custom': return `Specific people${a._count?.recipients ? ` (${a._count.recipients})` : ''}`
  }
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const TABS = [
  { id: 'mine', label: 'Posted by me' },
  { id: 'incoming', label: 'For me' },
  { id: 'all', label: 'All' },
] as const
type Tab = typeof TABS[number]['id']

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')

  const loadAnnouncements = () => {
    setLoading(true)
    api
      .get<{ data: Announcement[] }>('/api/announcements')
      .then((res: any) => {
        const data = res?.data ?? res
        setAnnouncements(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAnnouncements() }, [])

  const handleOpen = async (id: string) => {
    try {
      const res: any = await api.get(`/api/announcements/${id}`)
      setSelected(res?.data ?? res)
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await api.delete(`/api/announcements/${id}`)
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = announcements.filter((a) => {
    if (tab === 'mine') return a.isMine
    if (tab === 'incoming') return !a.isMine
    return true
  })

  const mineCount = announcements.filter((a) => a.isMine).length
  const incomingCount = announcements.length - mineCount

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Announcements</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Post to your classes, your subjects, or specific students &amp; parents.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="self-start md:self-auto px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-800 hover:from-brand-700 hover:to-brand-900 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            + New announcement
          </button>
        </div>

        <div className="mb-6 flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl self-start w-fit">
          {TABS.map((t) => {
            const count = t.id === 'mine' ? mineCount : t.id === 'incoming' ? incomingCount : announcements.length
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  active
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                    active ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-slate-400 dark:text-slate-500">
              {tab === 'mine' ? "You haven't posted any announcements yet" : 'Nothing here'}
            </p>
            {tab === 'mine' && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium text-sm"
              >
                Publish your first announcement →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((a) => (
              <article
                key={a.id}
                onClick={() => handleOpen(a.id)}
                className={`group relative cursor-pointer rounded-2xl border bg-white dark:bg-slate-800 p-5 transition-all hover:shadow-lg ${
                  a.pinned
                    ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-900/10'
                    : 'border-slate-100 dark:border-slate-700'
                } ${!a.isRead ? 'ring-2 ring-brand-500/20' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {a.pinned && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                        Pinned
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${AUDIENCE_TONE[a.audience]}`}
                      title={audienceLabel(a)}
                    >
                      {audienceLabel(a)}
                    </span>
                    {!a.isRead && !a.isMine && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 ring-4 ring-brand-500/20" aria-label="Unread" />
                    )}
                  </div>
                  {a.isMine && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                      disabled={deletingId === a.id}
                      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === a.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1">
                  {a.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {a.body}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>by {a.creator?.name}</span>
                  <span>
                    {formatDate(a.createdAt)}
                    {a.isMine && a._count?.reads !== undefined && ` · ${a._count.reads} read`}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 bg-gradient-to-r from-brand-600 to-brand-800 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {selected.pinned && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-300 text-amber-950">
                        Pinned
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-white/20 text-white">
                      {audienceLabel(selected)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-white/70 hover:text-white"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h2 className="text-xl font-bold mt-3">{selected.title}</h2>
                <p className="text-xs text-white/70 mt-1">
                  {formatDate(selected.createdAt)} · {selected.creator?.name}
                </p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-7rem)]">
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200 leading-relaxed">
                  {selected.body}
                </p>
              </div>
            </div>
          </div>
        )}

        <AnnouncementForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onCreated={loadAnnouncements}
          role="teacher"
        />
      </div>
    </div>
  )
}
