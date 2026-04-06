'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ReplyCard from '@/components/discussion/ReplyCard'
import RichTextEditor from '@/components/discussion/RichTextEditor'

interface Thread {
  id: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  isAnswered: boolean
  viewCount: number
  upvoteCount: number
  hasUpvoted?: boolean
  tags?: string[]
  author: { id: string; name: string; role: string }
  createdAt: string
  replies: Reply[]
}

interface Reply {
  id: string
  content: string
  isAccepted: boolean
  upvoteCount: number
  hasUpvoted?: boolean
  author: { id: string; name: string; role: string }
  createdAt: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ThreadDetailPage() {
  const { boardId, threadId } = useParams<{ boardId: string; threadId: string }>()
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setCurrentUser(JSON.parse(stored))
  }, [])

  const fetchThread = () => {
    api.get(`/api/discussions/threads/${threadId}`)
      .then((r) => setThread(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchThread() }, [threadId])

  const handleUpvoteThread = async () => {
    await api.post(`/api/discussions/threads/${threadId}/upvote`)
    fetchThread()
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent || replyContent === '<p><br></p>') return
    setSubmitting(true)
    try {
      await api.post(`/api/discussions/threads/${threadId}/replies`, { content: replyContent })
      setReplyContent('')
      fetchThread()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvoteReply = async (replyId: string) => {
    await api.post(`/api/discussions/replies/${replyId}/upvote`)
    fetchThread()
  }

  const handleAcceptReply = async (replyId: string) => {
    await api.post(`/api/discussions/replies/${replyId}/accept`)
    fetchThread()
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return
    await api.delete(`/api/discussions/replies/${replyId}`)
    fetchThread()
  }

  if (loading) return (
    <div className="page-container max-w-3xl">
      <div className="space-y-4">
        <div className="h-32 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        <div className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  )

  if (!thread) return (
    <div className="page-container max-w-3xl">
      <p className="text-slate-500">Thread not found.</p>
    </div>
  )

  const isAuthor = currentUser?.id === thread.author.id
  const canModerate = currentUser?.role === 'teacher' || currentUser?.role === 'admin'

  return (
    <div className="page-container max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href="/discussions" className="hover:text-brand-600">Discussions</Link>
        <span>›</span>
        <Link href={`/discussions/${boardId}`} className="hover:text-brand-600">Board</Link>
        <span>›</span>
        <span className="text-slate-600 dark:text-slate-300 truncate">{thread.title}</span>
      </div>

      {/* Thread */}
      <div className="card mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-1.5 mb-1">
              {thread.isPinned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">📌 Pinned</span>}
              {thread.isAnswered && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">✅ Answered</span>}
              {thread.isLocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">🔒 Locked</span>}
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{thread.title}</h1>
          </div>
        </div>

        <div
          className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 mb-4"
          dangerouslySetInnerHTML={{ __html: thread.content }}
        />

        {thread.tags && thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {thread.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">{thread.author.name}</span>
            <span>·</span>
            <span>{timeAgo(thread.createdAt)}</span>
            <span>·</span>
            <span>{thread.viewCount} views</span>
          </div>
          <button
            onClick={handleUpvoteThread}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
              thread.hasUpvoted
                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'
            }`}
          >
            ▲ {thread.upvoteCount}
          </button>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3 mb-6">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          {thread.replies.length} {thread.replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>
        {thread.replies.map((reply) => (
          <ReplyCard
            key={reply.id}
            reply={reply}
            currentUserId={currentUser?.id}
            currentUserRole={currentUser?.role}
            isThreadAuthor={isAuthor}
            threadIsAnswered={thread.isAnswered}
            onUpvote={handleUpvoteReply}
            onAccept={canModerate || isAuthor ? handleAcceptReply : undefined}
            onDelete={canModerate || currentUser?.id === reply.author.id ? handleDeleteReply : undefined}
          />
        ))}
      </div>

      {/* Reply form */}
      {!thread.isLocked ? (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Your Reply</h3>
          <form onSubmit={handleReply} className="space-y-3">
            <RichTextEditor
              value={replyContent}
              onChange={setReplyContent}
              placeholder="Write a helpful reply…"
              minHeight={120}
            />
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              {submitting ? 'Posting…' : 'Post Reply'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card text-center py-4 text-sm text-slate-400">
          🔒 This thread is locked. No new replies allowed.
        </div>
      )}
    </div>
  )
}
