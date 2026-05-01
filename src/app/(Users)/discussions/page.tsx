'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import DashboardLayout from '@/components/ui/DashboardLayout'

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
    api.get('/api/discussions/boards')
      .then((r) => {
        // Backend returns { success: true, data: [...] }
        const raw: RawBoard[] = r.data?.data ?? (Array.isArray(r.data) ? r.data : [])
        setBoards(
          raw.map((b) => ({
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
    <DashboardLayout>
      <div className="page-container">
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 card animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
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
    </DashboardLayout>
  )
}

function BoardRow({ board }: { board: Board }) {
  const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
    qa:           { icon: '❓', color: 'bg-amber-100 dark:bg-amber-900/30',   label: 'Q&A' },
    general:      { icon: '💬', color: 'bg-brand-100 dark:bg-brand-900/30',   label: 'General' },
    announcement: { icon: '📢', color: 'bg-red-100 dark:bg-red-900/30',       label: 'Announcement' },
    debate:       { icon: '⚖️',  color: 'bg-purple-100 dark:bg-purple-900/30', label: 'Debate' },
    personal:     { icon: '💌', color: 'bg-pink-100 dark:bg-pink-900/30',     label: 'Private' },
    class:        { icon: '🏫', color: 'bg-teal-100 dark:bg-teal-900/30',     label: 'Class' },
    class_parents:{ icon: '👨‍👩‍👧', color: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Parents' },
  }
  const cfg = typeConfig[board.type] || { icon: '💬', color: 'bg-slate-100 dark:bg-slate-800', label: board.type }

  return (
    <Link
      href={`/discussions/${board.id}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all duration-200"
    >
      <div className={`w-11 h-11 rounded-2xl ${cfg.color} flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {board.title}
          </h3>
          {board.isLocked && <span className="text-[10px]">🔒</span>}
        </div>
        {board.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{board.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{cfg.label}</span>
          {board.room && <span className="text-[10px] text-slate-400">· {board.room.name}</span>}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {board.threadCount}
        </span>
        <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-400 transition-colors mt-1 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
