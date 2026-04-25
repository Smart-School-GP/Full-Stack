'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import api from '@/lib/api'

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const MegaphoneIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
)

const BookOpenIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const PinIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

export default function ParentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'curriculum' | 'general'>('all')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = () => {
    setLoading(true)
    api
      .get('/api/announcements')
      .then((res) => setAnnouncements(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleRead = async (id: string) => {
    try {
      const res = await api.get(`/api/announcements/${id}`)
      setSelectedAnnouncement(res)
      api.get('/api/announcements').then((r) => setAnnouncements(Array.isArray(r) ? r : []))
    } catch (err) {
      console.error(err)
    }
  }

  const filteredAnnouncements = announcements.filter((a) => {
    if (activeTab === 'all') return true
    if (activeTab === 'curriculum') return a.category === 'curriculum'
    return a.category !== 'curriculum'
  })

  const curriculumCount = announcements.filter((a) => a.category === 'curriculum').length
  const generalCount = announcements.length - curriculumCount

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Notice Board</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              School news and curriculum updates relevant to your children.
            </p>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl self-start">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              All Updates
            </button>
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'curriculum'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BookOpenIcon />
              Curriculum
              {curriculumCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">
                  {curriculumCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <MegaphoneIcon />
              General
              {generalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-full">
                  {generalCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 animate-pulse h-48"
              />
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <MegaphoneIcon />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No announcements found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Check back later for new updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => handleRead(announcement.id)}
                className={`group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer shadow-sm hover:shadow-lg ${
                  !announcement.isRead
                    ? 'ring-2 ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5'
                    : ''
                } ${announcement.pinned ? 'border-amber-200 bg-amber-50/30 dark:bg-amber-500/5' : ''}`}
              >
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {announcement.pinned && (
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-lg shadow-sm">
                      <PinIcon />
                    </div>
                  )}
                  {!announcement.isRead && (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                        announcement.category === 'curriculum'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {announcement.category || 'General'}
                    </span>
                    {announcement.subject && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
                        {announcement.subject.name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {announcement.title}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-6">
                    {announcement.body}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                        {announcement.creator?.name?.[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {announcement.creator?.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatDate(announcement.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-xs font-bold">
                      Read More
                      <ChevronRightIcon />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Announcement Detail Modal */}
        {selectedAnnouncement && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedAnnouncement(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-32 bg-gradient-to-r from-emerald-600 to-emerald-800 p-8">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {selectedAnnouncement.category || 'General'}
                  </span>
                  {selectedAnnouncement.pinned && (
                    <span className="px-3 py-1 bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                      <PinIcon />
                      Pinned
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white truncate pr-12">
                  {selectedAnnouncement.title}
                </h2>
              </div>

              <div className="p-8 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <UserIcon />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedAnnouncement.creator?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedAnnouncement.creator?.role === 'admin'
                          ? 'School Administrator'
                          : 'Subject Teacher'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                      <ClockIcon />
                      {formatDate(selectedAnnouncement.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.body}
                  </p>
                </div>

                {selectedAnnouncement.subject && (
                  <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <BookOpenIcon />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Related Subject
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedAnnouncement.subject.name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-12">
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold rounded-2xl transition-all"
                  >
                    Close Notice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
