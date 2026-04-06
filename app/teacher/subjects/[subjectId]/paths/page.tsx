'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import api from '@/lib/api'

interface Path {
  id: string
  title: string
  description?: string
  isPublished: boolean
  xpReward: number
  moduleCount?: number
  itemCount?: number
  createdAt: string
}

export default function SubjectPathsPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const [paths, setPaths] = useState<Path[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPaths = () => {
    api.get(`/api/learning-paths/subject/${subjectId}`)
      .then((r) => setPaths(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPaths() }, [subjectId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await api.post('/api/learning-paths', {
        subjectId,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      })
      setCreating(false)
      setNewTitle('')
      setNewDesc('')
      fetchPaths()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create path')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async (path: Path) => {
    await api.put(`/api/learning-paths/${path.id}`, { isPublished: !path.isPublished })
    fetchPaths()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this learning path? This cannot be undone.')) return
    await api.delete(`/api/learning-paths/${id}`)
    fetchPaths()
  }

  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Learning Paths</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{paths.length} paths</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary text-sm">+ New Path</button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 card animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : paths.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-slate-500 dark:text-slate-400">No learning paths yet</p>
          <button onClick={() => setCreating(true)} className="btn-primary mt-4 text-sm">Create First Path</button>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => (
            <div key={path.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{path.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    path.isPublished
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {path.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                {path.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{path.description}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">+{path.xpReward} XP on completion</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/teacher/subjects/${subjectId}/paths/${path.id}/builder`}
                  className="text-xs px-2 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition-colors"
                >
                  Build
                </Link>
                <Link
                  href={`/teacher/subjects/${subjectId}/paths/${path.id}/progress`}
                  className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Progress
                </Link>
                <button
                  onClick={() => handleTogglePublish(path)}
                  className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    path.isPublished
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100'
                      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {path.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => handleDelete(path.id)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">New Learning Path</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                className="input"
                placeholder="Path title *"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <textarea
                className="input"
                placeholder="Description (optional)"
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Creating…' : 'Create'}
                </button>
                <button type="button" onClick={() => setCreating(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
