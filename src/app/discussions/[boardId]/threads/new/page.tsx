'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import RichTextEditor from '@/components/discussion/RichTextEditor'

export default function NewThreadPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content || content === '<p><br></p>') {
      setError('Title and content are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.post(`/api/discussions/boards/${boardId}/threads`, {
        title: title.trim(),
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      router.push(`/discussions/${boardId}/threads/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create thread')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/discussions" className="hover:text-brand-600">Discussions</Link>
          <span>›</span>
          <Link href={`/discussions/${boardId}`} className="hover:text-brand-600">Board</Link>
          <span>›</span>
          <span className="text-slate-600 dark:text-slate-300">New Thread</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Start a Discussion</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              className="input text-base"
              placeholder="What's your question or topic?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Content *
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Describe your question or topic in detail…"
              minHeight={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tags (optional)
            </label>
            <input
              className="input"
              placeholder="e.g. homework, chapter-3, urgent (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Posting…' : 'Post Thread'}
          </button>
          <Link href={`/discussions/${boardId}`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
