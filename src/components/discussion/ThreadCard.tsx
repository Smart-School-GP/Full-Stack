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
      className="block card hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Stats column */}
        <div className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0 min-w-[48px] text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{thread.replyCount}</span>
            <br />replies
          </div>
          {thread.upvoteCount > 0 && (
            <div className="text-xs text-slate-400">
              <span className="font-medium">{thread.upvoteCount}</span>
              <br />votes
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {thread.isPinned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                📌 Pinned
              </span>
            )}
            {thread.isAnswered && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                ✅ Answered
              </span>
            )}
            {thread.isLocked && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
                🔒 Locked
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-800 dark:text-white text-sm leading-snug line-clamp-2">
            {thread.title}
          </h3>

          {thread.tags && thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {thread.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
            <span>{thread.author.name}</span>
            <span>·</span>
            <span>{timeAgo(thread.createdAt)}</span>
            <span>·</span>
            <span>{thread.viewCount} views</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">last active {timeAgo(thread.lastActivity)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
