'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)
  const { user } = useAuth()

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = () => {
    api.get('/api/announcements')
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
      setSelectedAnnouncement(res?.data ?? res)
      loadAnnouncements()
    } catch (err) {
      console.error(err)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-slate-500 mt-1">Stay updated with school news</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => handleRead(announcement.id)}
                className={`card cursor-pointer hover:shadow-md transition-all ${
                  !announcement.isRead ? 'border-l-4 border-l-brand-500' : ''
                } ${announcement.pinned ? 'bg-amber-50 border border-amber-200' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {announcement.pinned && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                          Pinned
                        </span>
                      )}
                      {!announcement.isRead && (
                        <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
                      )}
                      <h3 className="font-semibold text-slate-800">{announcement.title}</h3>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{announcement.body}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-slate-400">{formatDate(announcement.createdAt)}</p>
                    <p className="text-xs text-slate-400 mt-1">by {announcement.creator?.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Announcement Modal */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {selectedAnnouncement.pinned && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                        Pinned
                      </span>
                    )}
                    <h2 className="text-xl font-bold text-slate-800">{selectedAnnouncement.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-sm text-slate-400 mb-4">
                  {formatDate(selectedAnnouncement.createdAt)} • by {selectedAnnouncement.creator?.name}
                </div>
                <div className="prose prose-sm max-w-none text-slate-600">
                  <p className="whitespace-pre-wrap">{selectedAnnouncement.body}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
