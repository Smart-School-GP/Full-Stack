'use client'

import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'
import PortfolioCard from '@/components/portfolio/PortfolioCard'

interface PortfolioItem {
  id: string
  title: string
  description?: string
  type: string
  fileUrl?: string
  thumbnailUrl?: string
  isPublic: boolean
  subject?: { name: string }
  createdAt: string
}

const TYPES = ['project', 'essay', 'artwork', 'certificate', 'achievement', 'other']

export default function StudentPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ title: '', description: '', type: 'project', isPublic: true })

  const fetchItems = () => {
    api.get('/api/portfolio/me')
      .then((r) => setItems(r))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!form.title.trim()) return

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('type', form.type)
      fd.append('isPublic', String(form.isPublic))
      if (file) fd.append('file', file)

      await api.post('/api/portfolio/items', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowForm(false)
      setForm({ title: '', description: '', type: 'project', isPublic: true })
      if (fileRef.current) fileRef.current.value = ''
      fetchItems()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this portfolio item?')) return
    await api.delete(`/api/portfolio/items/${id}`)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    await api.put(`/api/portfolio/items/${id}`, { isPublic })
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isPublic } : i)))
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter)

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">My Portfolio</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{items.length} items</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Item</button>
      </div>

      {/* Filter pills */}
      <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit mb-8 overflow-x-auto scrollbar-hide">
        {['all', ...TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              filter === t
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 card animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-slate-500 dark:text-slate-400">No portfolio items yet</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">Add your first item</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <PortfolioCard
              key={item.id}
              item={item}
              isOwn
              onDelete={handleDelete}
              onTogglePublic={handleTogglePublic}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Add Portfolio Item</h3>
            <form onSubmit={handleUpload} className="space-y-3">
              <input
                className="input"
                placeholder="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <textarea
                className="input"
                placeholder="Description (optional)"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">File (optional)</label>
                <input ref={fileRef} type="file" className="text-sm text-slate-600 dark:text-slate-300" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  className="rounded"
                />
                Make public (visible on your profile)
              </label>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={uploading} className="btn-primary flex-1">
                  {uploading ? 'Uploading…' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
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
