'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import RichTextEditor from '@/components/discussion/RichTextEditor'
import DashboardLayout from '@/components/ui/DashboardLayout'

interface Board {
  id: string
  title: string
}

export default function NewThreadPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const router = useRouter()
  const [board, setBoard] = useState<Board | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/discussions/boards/${boardId}`)
      .then((r) => setBoard(r.data))
      .catch(console.error)
  }, [boardId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content || content === '<p><br></p>') {
      setError('Please provide both a title and some content for your discussion.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.post(`/api/discussions/boards/${boardId}/threads`, {
        title: title.trim(),
        body: content, // The backend expects 'body'
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      router.push(`/discussions/${boardId}/threads/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create thread. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="page-container max-w-5xl">
        {/* Header Section */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
            <Link href="/discussions" className="hover:text-brand-600 transition-colors">Discussions</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href={`/discussions/${boardId}`} className="hover:text-brand-600 transition-colors">
              {board?.title || 'Board'}
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-600 dark:text-slate-300">New Discussion</span>
          </nav>
          
          <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Start a New Conversation
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Share your thoughts, ask questions, or start a debate with your peers.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Form Column */}
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 md:p-8 space-y-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                    Discussion Title
                  </label>
                  <input
                    className="input text-lg font-bold py-4 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    placeholder="What's on your mind? Be descriptive..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                    Detailed Content
                  </label>
                  <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="Provide details, share context, or ask your question here..."
                      minHeight={300}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                    Tags (Optional)
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono">#</span>
                    <input
                      className="input pl-8 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:bg-white dark:focus:bg-slate-800 transition-all"
                      placeholder="e.g. math, urgent, exam-prep (comma separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="btn-primary px-10 py-3 text-sm font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Post Discussion
                    </>
                  )}
                </button>
                <Link 
                  href={`/discussions/${boardId}`} 
                  className="btn-secondary px-8 py-3 text-sm font-bold flex items-center justify-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          {/* Sidebar Column */}
          <div className="lg:w-80 flex-shrink-0 space-y-6">
            <div className="bg-brand-500 rounded-3xl p-6 text-white shadow-xl shadow-brand-500/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="bg-white/20 p-1.5 rounded-lg">💡</span>
                Posting Tips
              </h3>
              <ul className="space-y-4 text-sm font-medium text-brand-50/90">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-400 flex items-center justify-center text-[10px]">1</span>
                  Be specific in your title to attract the right audience.
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-400 flex items-center justify-center text-[10px]">2</span>
                  Use the formatting tools to make your post easy to read.
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-400 flex items-center justify-center text-[10px]">3</span>
                  Relevant tags help people find your discussion later.
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">
                Community Guidelines
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Be respectful and supportive of your fellow students.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avoid spamming or posting duplicate content.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Report any inappropriate behavior to the moderator.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
