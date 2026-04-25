'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import ModuleCard from '@/components/curriculum/ModuleCard'
import PathProgress from '@/components/curriculum/PathProgress'

interface PathDetail {
  id: string
  title: string
  description?: string
  xpReward: number
  subject?: { name: string }
  modules: (Module & { isLocked: boolean; items: (any & { status: string })[] })[]
}

interface Module {
  id: string
  title: string
  description?: string
  orderIndex: number
  items: any[]
}

export default function StudentPathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>()
  const [path, setPath] = useState<PathDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchPath = () => {
    api.get(`/api/learning-paths/${pathId}/my-progress`)
      .then((r) => setPath(r))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPath() }, [pathId])

  const handleComplete = async (itemId: string) => {
    setCompleting(itemId)
    try {
      await api.post(`/api/learning-paths/items/${itemId}/complete`)
      fetchPath()
    } catch (err) {
      console.error(err)
    } finally {
      setCompleting(null)
    }
  }

  if (loading) return (
    <div className="page-container max-w-3xl">
      <div className="space-y-4">
        <div className="h-32 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        <div className="h-48 card animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  )

  if (!path) return (
    <div className="page-container max-w-3xl">
      <p className="text-slate-500">Path not found.</p>
    </div>
  )

  const completedSet = new Set(
    path.modules.flatMap((m) => m.items.filter((i) => i.status === 'completed').map((i) => i.id))
  )
  const lockedSet = new Set(path.modules.filter((m) => m.isLocked).map((m) => m.id))
  const totalItems = path.modules.reduce((sum, m) => sum + m.items.length, 0)
  const completedItems = completedSet.size

  const moduleProgress = path.modules.map((m) => ({
    moduleId: m.id,
    title: m.title,
    totalItems: m.items.length,
    completedItems: m.items.filter((i) => i.status === 'completed').length,
    isUnlocked: !m.isLocked,
  }))

  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href="/student/paths" className="hover:text-brand-600">Learning Paths</Link>
        <span>›</span>
        <span className="text-slate-600 dark:text-slate-300">{path.title}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{path.title}</h1>
        {path.subject && <p className="text-sm text-slate-400 mt-1">{path.subject.name}</p>}
        {path.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{path.description}</p>}
      </div>

      <div className="mb-6">
        <PathProgress
          pathTitle={path.title}
          totalItems={totalItems}
          completedItems={completedItems}
          modules={moduleProgress}
          xpReward={path.xpReward}
        />
      </div>

      <div className="space-y-4">
        {path.modules.sort((a, b) => a.orderIndex - b.orderIndex).map((mod, idx) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            moduleIndex={idx}
            isEditing={false}
            completedItems={completedSet}
            lockedModuleIds={lockedSet}
            onCompleteItem={handleComplete}
          />
        ))}
      </div>
    </div>
  )
}
