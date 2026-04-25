'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import AnnouncementForm from '@/components/announcements/AnnouncementForm'

interface AnnouncementCreator { id: string; name: string; role: string }
interface AnnouncementSubject { id: string; name: string }
interface AnnouncementRoom { id: string; name: string }

interface Announcement {
  id: string
  title: string
  body: string
  audience: 'all' | 'teachers' | 'parents' | 'students' | 'subject' | 'room' | 'custom'
  category: string
  pinned: boolean
  expiresAt: string | null
  createdAt: string
  createdBy: string
  isRead: boolean
  isMine: boolean
  creator?: AnnouncementCreator
  subject?: AnnouncementSubject | null
  room?: AnnouncementRoom | null
  _count?: { reads: number; recipients: number }
}

const AUDIENCE_TONE: Record<Announcement['audience'], string> = {
  all: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  teachers: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  parents: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
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
    case 'subject': return a.subject ? `Subject: ${a.subject.name}` : 'Subject'
    case 'room': return a.room ? `Class: ${a.room.name}` : 'Class'
    case 'custom': return `Specific people${a._count?.recipients ? ` (${a._count.recipients})` : ''}`
  }
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canCreate = user?.role === 'admin' || user?.role === 'teacher'

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = () => {
    setLoading(true)
    api.get<{ data: Announcement[] }>('/api/announcements')
      .then((res: any) => {
        const data = res?.data ?? res
        setAnnouncements(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleRead = async (id: string) => {
    try {
      const res: any = await api.get(`/api/announcements/${id}`)
      const data = res?.data ?? res
      setSelected(data)
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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Announcements</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Stay updated with school news</p>
          </div>
          {canCreate && (
            <button className="btn-primary whitespace-nowrap" onClick={() => setShowForm(true)}>
              + New
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400 dark:text-slate-500">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`card cursor-pointer hover:shadow-md transition-all ${
                  !announcement.isRead ? 'border-l-4 border-l-brand-500' : ''
                } ${announcement.pinned ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/40' : ''}`}
                onClick={() => handleRead(announcement.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {announcement.pinned && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded dark:bg-amber-900/40 dark:text-amber-200">
                          Pinned
                        </span>
                      )}
                      {!announcement.isRead && (
                        <span className="w-2 h-2 bg-brand-500 rounded-full" aria-label="Unread" />
                      )}
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {announcement.title}
                      </h3>
                      <span
                        className={`badge ${AUDIENCE_TONE[announcement.audience]}`}
                        title={audienceLabel(announcement)}
                      >
                        {audienceLabel(announcement)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {announcement.body}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(announcement.createdAt)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      by {announcement.creator?.name}
                    </p>
                    {announcement.isMine && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                        onClick={(e) => { e.stopPropagation(); handleDelete(announcement.id) }}
                        disabled={deletingId === announcement.id}
                      >
                        {deletingId === announcement.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {selected.pinned && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                        Pinned
                      </span>
                    )}
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {selected.title}
                    </h2>
                    <span className={`badge ${AUDIENCE_TONE[selected.audience]}`}>
                      {audienceLabel(selected)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                  {formatDate(selected.createdAt)} • by {selected.creator?.name}
                </div>
                <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300">
                  <p className="whitespace-pre-wrap">{selected.body}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {canCreate && user && (
          <AnnouncementForm
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            onCreated={loadAnnouncements}
            role={user.role as 'admin' | 'teacher'}
          />
        )}
      </div>
    </div>
  )
}
