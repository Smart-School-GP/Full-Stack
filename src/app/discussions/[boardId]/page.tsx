'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import ThreadCard from '@/components/discussion/ThreadCard'

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

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/discussions" className="hover:text-brand-600">Discussions</Link>
          <span>›</span>
          <span className="text-slate-600 dark:text-slate-300">{board?.title || '…'}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{board?.title}</h1>
            {board?.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{board.description}</p>
            )}
            {(board?.subject || board?.room) && (
              <div className="flex gap-3 mt-1 text-xs text-slate-400">
                {board?.subject && <span>📚 {board.subject.name}</span>}
                {board?.room && <span>🏫 {board.room.name}</span>}
              </div>
            )}
          </div>
          {board && !board.isLocked && (
            <Link href={`/discussions/${boardId}/threads/new`} className="btn-primary text-sm flex-shrink-0">
              + New Thread
            </Link>
          )}
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => { setSort(s); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              sort === s
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 card animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">💬</p>
          <p>No threads yet. Be the first to start a discussion!</p>
          {board && !board.isLocked && (
            <Link href={`/discussions/${boardId}/threads/new`} className="btn-primary text-sm mt-4 inline-block">
              Start Thread
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <ThreadCard key={t.id} thread={t} boardId={boardId} />
          ))}
        </div>
      )}

      {total > LIMIT && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500 py-2">Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / LIMIT)}
            className="btn-secondary text-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
