'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import PortfolioCard from '@/components/portfolio/PortfolioCard'
import BadgeChip from '@/components/portfolio/BadgeChip'
import XPBar from '@/components/portfolio/XPBar'

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

export default function PublicPortfolioPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null)
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [xpData, setXpData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/api/portfolio/${studentId}`),
      api.get(`/api/xp/student/${studentId}`).catch(() => ({ data: null })),
    ]).then(([portRes, xpRes]) => {
      setStudent(portRes.data.student)
      setItems(portRes.data.items || [])
      setXpData(xpRes.data)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [studentId])

  if (loading) return (
    <div className="page-container max-w-3xl">
      <div className="space-y-4">
        <div className="h-20 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 card animate-pulse bg-slate-100 dark:bg-slate-800" />)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {student?.name}'s Portfolio
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{items.length} public items</p>
      </div>

      {xpData && (
        <div className="card mb-6">
          <XPBar
            totalXP={xpData.totalXP}
            level={xpData.level}
            currentXP={xpData.currentXP}
            requiredXP={xpData.requiredXP}
            percentage={xpData.percentage}
            compact
          />
          {xpData.earnedBadges && xpData.earnedBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {xpData.earnedBadges.map((badge: any) => (
                <BadgeChip key={badge.id} badge={badge} size="sm" />
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-slate-500 dark:text-slate-400">No public portfolio items yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
