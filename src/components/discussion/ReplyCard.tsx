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

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const ROLE_COLOR: Record<string, string> = {
  teacher: 'text-blue-500 dark:text-blue-400',
  admin: 'text-purple-500 dark:text-purple-400',
  student: 'text-emerald-500 dark:text-emerald-400',
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
  const isSelf = currentUserId === reply.author.id

  const canDelete =
    isSelf ||
    currentUserRole === 'teacher' ||
    currentUserRole === 'admin'

  const canAccept = isThreadAuthor && !threadIsAnswered && !reply.isAccepted

  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} mb-2 group w-full`}>
      {/* Author Name for others */}
      {!isSelf && (
        <span className={`text-[10px] font-bold ml-3 mb-0.5 uppercase tracking-wider ${ROLE_COLOR[reply.author.role] || 'text-slate-400'}`}>
          {reply.author.name} • {reply.author.role}
        </span>
      )}

      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
        {/* Bubble */}
        <div 
          className={`relative px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 ${
            isSelf 
              ? 'bg-brand-600 text-white rounded-tr-none' 
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
          } ${reply.isAccepted ? 'ring-2 ring-emerald-400 dark:ring-emerald-500/50' : ''}`}
        >
          {reply.isAccepted && (
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase mb-1.5 ${isSelf ? 'text-brand-100' : 'text-emerald-500'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              Accepted Solution
            </div>
          )}

          <div
            className={`prose prose-sm max-w-none break-words ${isSelf ? 'prose-invert text-white' : 'dark:prose-invert'}`}
            dangerouslySetInnerHTML={{ __html: reply.content }}
          />

          {/* Footer inside bubble */}
          <div className={`flex items-center justify-end gap-3 mt-1.5 text-[9px] font-medium ${isSelf ? 'text-brand-200' : 'text-slate-400'}`}>
            <span>{formatTime(reply.createdAt)}</span>
            <div className="flex items-center gap-1">
              {reply.upvoteCount > 0 && <span>👍 {reply.upvoteCount}</span>}
              {isSelf && (
                <svg className="w-3 h-3 text-brand-200" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Hover Actions Menu */}
        <div className={`flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isSelf ? 'order-first' : ''}`}>
          <button
            onClick={() => onUpvote(reply.id)}
            disabled={upvoting}
            className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${reply.hasUpvoted ? 'text-brand-500' : 'text-slate-400'}`}
            title="Upvote"
          >
            <svg className="w-4 h-4" fill={reply.hasUpvoted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.708C19.923 10 21 11.077 21 12.412c0 1.335-1.077 2.412-2.412 2.412H14v5.176c0 1.335-1.077 2.412-2.412 2.412-1.335 0-2.412-1.077-2.412-2.412V14.824H4.529C3.134 14.824 2 13.69 2 12.294c0-1.396 1.134-2.53 2.529-2.53H9.176V4.588c0-1.335 1.077-2.412 2.412-2.412 1.335 0 2.412 1.077 2.412 2.412V9.765H14z" />
            </svg>
          </button>
          
          {canAccept && onAccept && (
            <button
              onClick={() => onAccept(reply.id)}
              className="p-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
              title="Accept as answer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(reply.id)}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
