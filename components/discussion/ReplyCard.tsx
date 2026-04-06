'use client'

import { useState } from 'react'

interface Reply {
  id: string
  content: string
  isAccepted: boolean
  upvoteCount: number
  author: { id: string; name: string; role: string }
  createdAt: string
  hasUpvoted?: boolean
}

interface ReplyCardProps {
  reply: Reply
  currentUserId?: string
  currentUserRole?: string
  isThreadAuthor?: boolean
  threadIsAnswered?: boolean
  onUpvote: (replyId: string) => Promise<void>
  onAccept?: (replyId: string) => Promise<void>
  onDelete?: (replyId: string) => Promise<void>
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ROLE_BADGE: Record<string, string> = {
  teacher: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  student: '',
}

export default function ReplyCard({
  reply,
  currentUserId,
  currentUserRole,
  isThreadAuthor,
  threadIsAnswered,
  onUpvote,
  onAccept,
  onDelete,
}: ReplyCardProps) {
  const [upvoting, setUpvoting] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const canDelete =
    currentUserId === reply.author.id ||
    currentUserRole === 'teacher' ||
    currentUserRole === 'admin'

  const canAccept = isThreadAuthor && !threadIsAnswered && !reply.isAccepted

  const handleUpvote = async () => {
    setUpvoting(true)
    try { await onUpvote(reply.id) } finally { setUpvoting(false) }
  }

  const handleAccept = async () => {
    setAccepting(true)
    try { await onAccept?.(reply.id) } finally { setAccepting(false) }
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        reply.isAccepted
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      {reply.isAccepted && (
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-3">
          <span>✅</span>
          <span>Accepted Answer</span>
        </div>
      )}

      <div
        className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 mb-3"
        dangerouslySetInnerHTML={{ __html: reply.content }}
      />

      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">{reply.author.name}</span>
          {ROLE_BADGE[reply.author.role] && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_BADGE[reply.author.role]}`}>
              {reply.author.role}
            </span>
          )}
          <span>·</span>
          <span>{timeAgo(reply.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleUpvote}
            disabled={upvoting}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
              reply.hasUpvoted
                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            ▲ {reply.upvoteCount}
          </button>

          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="text-xs px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              title="Mark as accepted answer"
            >
              ✓ Accept
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(reply.id)}
              className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
