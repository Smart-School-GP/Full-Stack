'use client'

import Link from 'next/link'

interface ThreadCardProps {
  thread: {
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
  boardId: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ThreadCard({ thread, boardId }: ThreadCardProps) {
  return (
    <Link
      href={`/discussions/${boardId}/threads/${thread.id}`}
      className="group block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 hover:border-brand-300 dark:hover:border-brand-600 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        {/* Stats column */}
        <div className="hidden sm:flex flex-col items-center gap-3 flex-shrink-0 min-w-[56px] py-1">
          <div className={`flex flex-col items-center justify-center w-full aspect-square rounded-xl border ${
            thread.isAnswered 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            <span className="text-sm font-bold leading-none">{thread.replyCount}</span>
            <span className="text-[9px] uppercase font-bold tracking-tight mt-0.5">replies</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {thread.viewCount}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {thread.isPinned && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 9V4l1 1V2H7v2l1-1v5c0 2.18-1.79 3.99-4 4v2h7v7l1 1 1-1v-7h7v-2c-2.21-.01-4-1.82-4-4z" />
                </svg>
                Pinned
              </span>
            )}
            {thread.isAnswered && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Solved
              </span>
            )}
            {thread.isLocked && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Locked
              </span>
            )}
          </div>

          <h3 className="font-bold text-slate-800 dark:text-white text-base leading-snug line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {thread.title}
          </h3>

          {thread.tags && thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {thread.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">
                {thread.author.name[0]}
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-400">{thread.author.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{timeAgo(thread.createdAt)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 ml-auto italic">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
              <span>last active {timeAgo(thread.lastActivity)}</span>
            </div>
          </div>
        </div>

        {/* Right arrow for desktop */}
        <div className="hidden md:flex self-center text-slate-300 group-hover:text-brand-500 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
