'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Modal from '@/components/ui/Modal'

interface Board {
  id: string
  title: string
  description?: string | null
  type: string
  isLocked: boolean
  _count?: { threads: number }
  creator?: { id: string; name: string }
}

interface Props {
  subjectId: string
  canCreate?: boolean
}

const TYPE_ICON: Record<string, string> = { qa: '❓', general: '💬', announcement: '📢', debate: '⚖️' }

export default function SubjectBoards({ subjectId, canCreate = false }: Props) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'general' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<Board[]>(`/api/discussions/boards/subject/${subjectId}`)
      setBoards(Array.isArray(r.data) ? r.data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (subjectId) load()
  }, [subjectId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/discussions/boards', {
        subject_id: subjectId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
      })
      setShowModal(false)
      setForm({ title: '', description: '', type: 'general' })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create board')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Discussion Boards</h2>
        {canCreate && (
          <button className="btn-secondary text-sm" onClick={() => { setError(''); setShowModal(true) }}>
            + New Board
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 card animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="card text-center py-8 text-sm text-slate-400">
          <p className="text-2xl mb-2">💬</p>
          <p>No discussion boards yet for this subject.</p>
          {canCreate && (
            <button className="btn-primary text-sm mt-3" onClick={() => { setError(''); setShowModal(true) }}>
              Create the first board
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/discussions/${b.id}`}
              className="card flex items-center gap-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xl flex-shrink-0">
                {TYPE_ICON[b.type] || '💬'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{b.title}</h3>
                {b.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{b.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {b._count?.threads ?? 0} threads
                </span>
                {b.isLocked && (
                  <span className="block text-[10px] text-slate-400 mt-0.5">🔒 Locked</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {canCreate && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Discussion Board">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Homework Q&amp;A"
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this board for?"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="general">💬 General discussion</option>
                <option value="qa">❓ Questions &amp; answers</option>
                <option value="debate">⚖️ Debate</option>
                <option value="announcement">📢 Announcements</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
