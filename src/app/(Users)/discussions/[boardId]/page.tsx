'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import ThreadCard from '@/components/discussion/ThreadCard'
import DashboardLayout from '@/components/ui/DashboardLayout'

interface Board {
  id: string
  title: string
  description?: string
  isLocked: boolean
  type: string
  subject?: { name: string } | null
  room?: { name: string } | null
}

interface Thread {
  id: string
  title: string
  isPinned: boolean
  isLocked: boolean
  isAnswered: boolean
  viewCount: number
  replyCount: number
  upvoteCount: number
  author: { id: string; name: string }
  createdAt: string
  lastActivity: string
  tags?: string[]
}

interface RawThread {
  id: string
  title: string
  body: string
  isPinned: boolean
  isLocked: boolean
  hasAcceptedAnswer: boolean
  views: number
  replyCount: number
  author: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

const SORTS = ['latest', 'popular', 'unanswered'] as const
type SortOption = typeof SORTS[number]

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const [board, setBoard] = useState<Board | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [sort, setSort] = useState<SortOption>('latest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const LIMIT = 20

  useEffect(() => {
    api.get(`/api/discussions/boards/${boardId}`)
      .then((r) => setBoard(r.data))
      .catch(console.error)
  }, [boardId])

  useEffect(() => {
    setLoading(true)
    api.get(`/api/discussions/boards/${boardId}/threads`, { params: { sort, page, limit: LIMIT } })
      .then((r) => {
        const raw: RawThread[] = r.data.threads || r.data
        setThreads(
          raw.map((t) => ({
            id: t.id,
            title: t.title,
            isPinned: t.isPinned,
            isLocked: t.isLocked,
            isAnswered: t.hasAcceptedAnswer,
            viewCount: t.views,
            replyCount: t.replyCount,
            upvoteCount: 0,
            author: t.author,
            createdAt: t.createdAt,
            lastActivity: t.updatedAt,
          }))
        )
        setTotal(r.data.total ?? raw.length)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [boardId, sort, page])

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads
    const s = search.toLowerCase()
    return threads.filter(t => t.title.toLowerCase().includes(s))
  }, [threads, search])

  const typeIcon: Record<string, string> = {
    qa: '❓', general: '💬', announcement: '📢', debate: '⚖️',
  }

  return (
    <DashboardLayout>
      <div className="page-container max-w-4xl">
      {/* Header Section */}
      <div className="relative mb-8 p-6 md:p-8 rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
            <Link href="/discussions" className="hover:text-brand-600 transition-colors">Discussions</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-600 dark:text-slate-300">{board?.title || 'Loading...'}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-2xl shadow-inner">
                  {typeIcon[board?.type || ''] || '💬'}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                    {board?.title}
                  </h1>
                  {board?.isLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Archived / Locked
                    </span>
                  )}
                </div>
              </div>
              
              {board?.description && (
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm leading-relaxed mb-4">
                  {board.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mt-2">
                {board?.subject && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                    <span className="text-xs">📚</span>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{board.subject.name}</span>
                  </div>
                )}
                {board?.room && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                    <span className="text-xs">🏫</span>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{board.room.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    <span className="text-slate-900 dark:text-white">{total}</span> Threads
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {board && !board.isLocked && (
                <Link 
                  href={`/discussions/${boardId}/threads/new`} 
                  className="btn-primary flex items-center justify-center gap-2 px-6 py-3 shadow-lg shadow-brand-500/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Discussion
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Sort Tabs */}
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 w-fit">
          {SORTS.map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1) }}
              className={`px-6 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all ${
                sort === s
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 group">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search discussions by title..."
            className="input w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Thread List Section */}
      {loading ? (
        <div className="page-container max-w-4xl">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 card animate-pulse bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700" />
            ))}
          </div>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
            {search ? '🔍' : '💬'}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            {search ? 'No results found' : 'No discussions yet'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {search 
              ? `We couldn't find any threads matching "${search}". Try a different keyword.` 
              : 'Be the first to share an idea or ask a question in this board!'}
          </p>
          {!search && board && !board.isLocked && (
            <Link href={`/discussions/${boardId}/threads/new`} className="btn-primary mt-6 inline-flex">
              Start Conversation
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredThreads.map((t) => (
            <ThreadCard key={t.id} thread={t} boardId={boardId} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && !search && (
        <div className="flex items-center justify-between mt-8 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <button
            onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo(0, 0) }}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:text-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          
          <div className="flex items-center gap-2">
            {[...Array(Math.ceil(total / LIMIT))].map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => { setPage(p); window.scrollTo(0, 0) }}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    page === p 
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                      : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0) }}
            disabled={page >= Math.ceil(total / LIMIT)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:text-brand-600 transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
