'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

interface Board {
  id: string
  title: string
  description?: string
  type: string
  isLocked: boolean
  threadCount: number
  subject?: { id: string; name: string }
  room?: { id: string; name: string }
  createdAt: string
}

interface RawBoard {
  id: string
  title: string
  description?: string
  type: string
  isLocked: boolean
  _count?: { threads: number }
  subject?: { id: string; name: string } | null
  room?: { id: string; name: string } | null
  createdAt: string
}

export default function DiscussionsPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<RawBoard[]>('/api/discussions/boards')
      .then((r) => {
        setBoards(
          r.data.map((b) => ({
            id: b.id,
            title: b.title,
            description: b.description,
            type: b.type,
            isLocked: b.isLocked,
            threadCount: b._count?.threads ?? 0,
            subject: b.subject ?? undefined,
            room: b.room ?? undefined,
            createdAt: b.createdAt,
          }))
        )
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Group by subject
  const grouped: Record<string, Board[]> = {}
  const noSubject: Board[] = []
  boards.forEach((b) => {
    if (b.subject) {
      const key = b.subject.name
      grouped[key] = grouped[key] || []
      grouped[key].push(b)
    } else {
      noSubject.push(b)
    }
  })

  if (loading) return (
    <div className="page-container">
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Discussion Boards</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ask questions, share ideas, and learn together</p>
      </div>

      {boards.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">💬</p>
          <p>No discussion boards available yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([subject, subjectBoards]) => (
            <div key={subject}>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {subject}
              </h2>
              <div className="space-y-2">
                {subjectBoards.map((board) => <BoardRow key={board.id} board={board} />)}
              </div>
            </div>
          ))}
          {noSubject.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                General
              </h2>
              <div className="space-y-2">
                {noSubject.map((board) => <BoardRow key={board.id} board={board} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BoardRow({ board }: { board: Board }) {
  const typeIcon: Record<string, string> = {
    qa: '❓', general: '💬', announcement: '📢', debate: '⚖️',
  }

  return (
    <Link
      href={`/discussions/${board.id}`}
      className="card flex items-center gap-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl flex-shrink-0">
        {typeIcon[board.type] || '💬'}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{board.title}</h3>
        {board.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{board.description}</p>
        )}
        {board.room && (
          <p className="text-[10px] text-slate-400 mt-0.5">Room: {board.room.name}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-slate-500 dark:text-slate-400">{board.threadCount} threads</span>
        {board.isLocked && (
          <span className="block text-[10px] text-slate-400 mt-0.5">🔒 Locked</span>
        )}
      </div>
    </Link>
  )
}
