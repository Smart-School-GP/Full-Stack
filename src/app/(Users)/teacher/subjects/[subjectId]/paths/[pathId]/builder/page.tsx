'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import PathBuilder from '@/components/curriculum/PathBuilder'

interface Module {
  id: string
  title: string
  description?: string
  orderIndex: number
  items: any[]
}

interface PathInfo {
  id: string
  title: string
  description?: string
  isPublished: boolean
  xpReward: number
  modules: Module[]
}

export default function PathBuilderPage() {
  const { subjectId, pathId } = useParams<{ subjectId: string; pathId: string }>()
  const [pathInfo, setPathInfo] = useState<PathInfo | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({ title: '', description: '', xpReward: 50 })

  const fetchPath = () => {
    api.get(`/api/learning-paths/${pathId}`)
      .then((r) => {
        setPathInfo(r.data)
        setModules(r.data.modules || [])
        setMetaForm({ title: r.data.title, description: r.data.description || '', xpReward: r.data.xpReward })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPath() }, [pathId])

  const handleSaveMeta = async () => {
    setSaving(true)
    try {
      await api.put(`/api/learning-paths/${pathId}`, metaForm)
      setEditingMeta(false)
      fetchPath()
    } finally {
      setSaving(false)
    }
  }

  const handleSaveModule = async (moduleId: string | null, data: any) => {
    if (moduleId) {
      await api.put(`/api/learning-paths/modules/${moduleId}`, data)
    } else {
      await api.post(`/api/learning-paths/${pathId}/modules`, data)
    }
    fetchPath()
  }

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its items?')) return
    await api.delete(`/api/learning-paths/modules/${moduleId}`)
    fetchPath()
  }

  const handleSaveItem = async (moduleId: string, itemId: string | null, data: any) => {
    if (itemId) {
      await api.put(`/api/learning-paths/items/${itemId}`, data)
    } else {
      await api.post(`/api/learning-paths/modules/${moduleId}/items`, data)
    }
    fetchPath()
  }

  const handleDeleteItem = async (itemId: string) => {
    await api.delete(`/api/learning-paths/items/${itemId}`)
    fetchPath()
  }

  const handleReorderModules = async (orderedIds: string[]) => {
    await api.put(`/api/learning-paths/${pathId}/modules/reorder`, { orderedIds })
  }

  const handleReorderItems = async (moduleId: string, orderedIds: string[]) => {
    await api.put(`/api/learning-paths/modules/${moduleId}/items/reorder`, { orderedIds })
  }

  if (loading) return (
    <div className="page-container max-w-3xl">
      <div className="space-y-4">
        <div className="h-20 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        <div className="h-40 card animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  )

  if (!pathInfo) return (
    <div className="page-container max-w-3xl">
      <p className="text-slate-500">Path not found.</p>
    </div>
  )

  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href={`/teacher/subjects/${subjectId}/paths`} className="hover:text-brand-600">Paths</Link>
        <span>›</span>
        <span className="text-slate-600 dark:text-slate-300">Builder</span>
      </div>

      {/* Path meta */}
      <div className="card mb-6">
        {editingMeta ? (
          <div className="space-y-3">
            <input
              className="input text-base font-semibold"
              value={metaForm.title}
              onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
            />
            <textarea
              className="input"
              rows={2}
              placeholder="Description"
              value={metaForm.description}
              onChange={(e) => setMetaForm({ ...metaForm, description: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">XP Reward:</label>
              <input
                type="number"
                className="input w-24"
                value={metaForm.xpReward}
                onChange={(e) => setMetaForm({ ...metaForm, xpReward: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveMeta} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingMeta(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">{pathInfo.title}</h1>
              {pathInfo.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{pathInfo.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span className={pathInfo.isPublished ? 'text-emerald-500' : 'text-slate-400'}>
                  {pathInfo.isPublished ? '● Published' : '○ Draft'}
                </span>
                <span>+{pathInfo.xpReward} XP on completion</span>
                <span>{modules.length} modules</span>
              </div>
            </div>
            <button onClick={() => setEditingMeta(true)} className="btn-secondary text-sm flex-shrink-0">
              Edit Details
            </button>
          </div>
        )}
      </div>

      {/* Builder */}
      <PathBuilder
        modules={modules}
        onChange={setModules}
        onSaveModule={handleSaveModule}
        onDeleteModule={handleDeleteModule}
        onSaveItem={handleSaveItem}
        onDeleteItem={handleDeleteItem}
        onReorderModules={handleReorderModules}
        onReorderItems={handleReorderItems}
      />
    </div>
  )
}
