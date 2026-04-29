'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ReplyCard from '@/components/discussion/ReplyCard'
import RichTextEditor from '@/components/discussion/RichTextEditor'
import { useUserStore } from '@/lib/store/userStore'
import DashboardLayout from '@/components/ui/DashboardLayout'

interface Thread {
  id: string
  title: string
  body: string // Changed from content to match backend
  isPinned: boolean
  isLocked: boolean
  hasAcceptedAnswer: boolean
  views: number
  upvoteCount: number
  hasUpvoted?: boolean
  tags?: string[]
  author: { id: string; name: string; role: string }
  createdAt: string
  replies: Reply[]
}

interface Reply {
  id: string
  body: string // Changed from content to match backend
  isAcceptedAnswer: boolean // Changed from isAccepted to match backend
  upvotes: number // Changed from upvoteCount to match backend
  hasUpvoted?: boolean
  author: { id: string; name: string; role: string }
  createdAt: string
}

function formatDateSeparator(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ThreadDetailPage() {
  const { boardId, threadId } = useParams<{ boardId: string; threadId: string }>()
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user: currentUser } = useUserStore()
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchThread = async (isManual = false) => {
    try {
      const res: any = await api.get(`/api/discussions/threads/${threadId}`)
      setThread(res.data)
      if (isManual) {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchThread() 
  }, [threadId])

  const handleUpvoteThread = async () => {
    await api.put(`/api/discussions/threads/${threadId}/upvote`)
    fetchThread()
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent || replyContent === '<p><br></p>') return
    setSubmitting(true)
    try {
      await api.post(`/api/discussions/threads/${threadId}/replies`, { body: replyContent })
      setReplyContent('')
      fetchThread(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvoteReply = async (replyId: string) => {
    await api.put(`/api/discussions/replies/${replyId}/upvote`)
    fetchThread()
  }

  const handleAcceptReply = async (replyId: string) => {
    await api.put(`/api/discussions/replies/${replyId}/accept`)
    fetchThread()
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Delete this message?')) return
    await api.delete(`/api/discussions/replies/${replyId}`)
    fetchThread()
  }

  if (loading) return (
    <DashboardLayout>
      <div className="page-container max-w-4xl">
        <div className="space-y-4">
          <div className="h-40 card animate-pulse bg-white dark:bg-slate-800" />
          <div className="h-24 card animate-pulse bg-white dark:bg-slate-800 w-2/3 ml-auto rounded-tr-none" />
          <div className="h-24 card animate-pulse bg-white dark:bg-slate-800 w-2/3 mr-auto rounded-tl-none" />
        </div>
      </div>
    </DashboardLayout>
  )

  if (!thread) return (
    <DashboardLayout>
      <div className="page-container max-w-4xl text-center py-20">
        <p className="text-slate-500 font-bold">Thread not found or has been deleted.</p>
        <Link href={`/discussions/${boardId}`} className="btn-primary mt-4 inline-block">Back to Board</Link>
      </div>
    </DashboardLayout>
  )

  const isAuthor = currentUser?.id === thread.author.id
  const canModerate = currentUser?.role === 'teacher' || currentUser?.role === 'admin'

  // Group replies by date
  const groupedReplies: { date: string, items: Reply[] }[] = []
  thread.replies.forEach(r => {
    const dateLabel = formatDateSeparator(r.createdAt)
    const lastGroup = groupedReplies[groupedReplies.length - 1]
    if (lastGroup && lastGroup.date === dateLabel) {
      lastGroup.items.push(r)
    } else {
      groupedReplies.push({ date: dateLabel, items: [r] })
    }
  })

  return (
    <DashboardLayout>
      <div className="min-h-screen pb-32">
        {/* Top Navigation */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Link href={`/discussions/${boardId}`} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <h1 className="font-bold text-slate-900 dark:text-white truncate text-sm sm:text-base">{thread.title}</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  started by <span className="text-brand-500">{thread.author.name}</span> • {thread.replies.length} replies
                </p>
              </div>
            </div>
            <button
              onClick={handleUpvoteThread}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                thread.hasUpvoted
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'
              }`}
            >
              👍 {thread.upvoteCount || 0}
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
          {/* Initial Thread Content as a special bubble */}
          <div className="flex flex-col items-start mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-3xl rounded-tl-none p-6 shadow-sm border border-slate-100 dark:border-slate-700 w-full">
               <div className="flex flex-wrap gap-2 mb-4">
                {thread.isPinned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">📌 Pinned</span>}
                {thread.isLocked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold uppercase tracking-wider">🔒 Locked</span>}
                {thread.tags?.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">#{t}</span>)}
              </div>
              
              <div
                className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 mb-4"
                dangerouslySetInnerHTML={{ __html: thread.body }}
              />
              
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <span>Posted {new Date(thread.createdAt).toLocaleString()}</span>
                <span>{thread.views} Views</span>
              </div>
            </div>
          </div>

          {/* Conversation List */}
          {groupedReplies.map((group) => (
            <div key={group.date} className="space-y-4">
              <div className="flex justify-center my-8">
                <span className="px-4 py-1 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                  {group.date}
                </span>
              </div>
              {group.items.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={{
                    id: reply.id,
                    content: reply.body,
                    isAccepted: reply.isAcceptedAnswer,
                    upvoteCount: reply.upvotes,
                    author: reply.author,
                    createdAt: reply.createdAt,
                    hasUpvoted: reply.hasUpvoted
                  }}
                  currentUserId={currentUser?.id}
                  currentUserRole={currentUser?.role}
                  isThreadAuthor={isAuthor}
                  threadIsAnswered={thread.hasAcceptedAnswer}
                  onUpvote={handleUpvoteReply}
                  onAccept={canModerate || isAuthor ? handleAcceptReply : undefined}
                  onDelete={canModerate || currentUser?.id === reply.author.id ? handleDeleteReply : undefined}
                />
              ))}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Sticky Bottom Input Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-700 p-4">
          <div className="max-w-4xl mx-auto">
            {!thread.isLocked ? (
              <form onSubmit={handleReply} className="flex items-end gap-3">
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <RichTextEditor
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="Type a message..."
                    minHeight={60}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submitting || !replyContent.trim()} 
                  className="w-14 h-14 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                >
                  {submitting ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2 p-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                This thread is locked for new replies
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
