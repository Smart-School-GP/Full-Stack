'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import api from '@/lib/api'
import BadgeChip from '@/components/portfolio/BadgeChip'

interface Badge {
  id: string
  name: string
  iconEmoji?: string
  color?: string
  description?: string
}

interface AwardBadgeModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  onAwarded?: () => void
}

export default function AwardBadgeModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  onAwarded,
}: AwardBadgeModalProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [selectedBadgeId, setSelectedBadgeId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      api.get('/api/badges/school')
        .then((res) => {
          setBadges(res.data.filter((b: any) => b.isActive))
        })
        .catch((err) => {
          console.error('Failed to fetch badges', err)
          setError('Failed to load badges')
        })
        .finally(() => setLoading(false))
    } else {
      setSelectedBadgeId('')
      setNote('')
      setError('')
    }
  }, [isOpen])

  const handleAward = async () => {
    if (!selectedBadgeId) return
    setSaving(true)
    setError('')
    try {
      await api.post('/api/badges/award', {
        student_id: studentId,
        badge_id: selectedBadgeId,
        note: note.trim(),
      })
      if (onAwarded) onAwarded()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to award badge')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Award Badge to ${studentName}`} size="md">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : badges.length === 0 ? (
          <p className="text-center py-8 text-slate-500">No active badges available.</p>
        ) : (
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Select a Badge
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {badges.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => setSelectedBadgeId(badge.id)}
                  className={`flex items-center text-left p-2 rounded-xl border transition-all ${
                    selectedBadgeId === badge.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-500/20'
                      : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <BadgeChip badge={badge} size="sm" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
            Add a Note (Optional)
          </label>
          <textarea
            className="input w-full dark:bg-slate-900 dark:border-slate-700"
            placeholder="Why are you awarding this badge?"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!selectedBadgeId || saving}
            onClick={handleAward}
          >
            {saving ? 'Awarding...' : 'Award Badge'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
