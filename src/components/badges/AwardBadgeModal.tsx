'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import api from '@/lib/api'
import BadgeChip from '@/components/portfolio/BadgeChip'

interface Badge {
  id: string
  name: string
  iconEmoji?: string
  iconUrl?: string
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
  const [awardType, setAwardType] = useState<'existing' | 'new'>('existing')

  // New badge fields
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🏅')
  const [newColor, setNewColor] = useState('#6366f1')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newPoints, setNewPoints] = useState(50)

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
      setAwardType('existing')
      setNewName('')
      setNewFile(null)
    }
  }, [isOpen])

  const handleAward = async () => {
    if (awardType === 'existing' && !selectedBadgeId) return
    if (awardType === 'new' && !newName.trim()) return

    setSaving(true)
    setError('')
    try {
      let badgeId = selectedBadgeId

      if (awardType === 'new') {
        const formData = new FormData()
        formData.append('name', newName)
        formData.append('iconEmoji', newEmoji)
        formData.append('color', newColor)
        formData.append('pointsValue', String(newPoints))
        formData.append('criteriaType', 'manual') // Manual badges don't auto-award
        formData.append('isActive', 'true')
        if (newFile) formData.append('icon', newFile)

        const badgeRes = await api.post('/api/badges', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        badgeId = badgeRes.data.id
      }

      await api.post('/api/badges/award', {
        student_id: studentId,
        badge_id: badgeId,
        note: note.trim(),
      })
      if (onAwarded) onAwarded()
      onClose()
    } catch (err: any) {
      const apiError = err.response?.data?.error
      setError(typeof apiError === 'string' ? apiError : apiError?.message || 'Failed to award badge')
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
        ) : (
          <div className="space-y-4">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setAwardType('existing')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  awardType === 'existing' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Existing Badge
              </button>
              <button
                onClick={() => setAwardType('new')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  awardType === 'new' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Upload New Badge
              </button>
            </div>

            {awardType === 'existing' ? (
              badges.length === 0 ? (
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
              )
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Badge Name</label>
                    <input 
                      className="input py-1.5 text-sm" 
                      placeholder="e.g. Helpful Hero" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">XP Reward</label>
                    <input 
                      type="number" 
                      className="input py-1.5 text-sm" 
                      value={newPoints} 
                      onChange={(e) => setNewPoints(parseInt(e.target.value))} 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Badge Icon (Upload Image)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="input py-1 text-xs" 
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Emoji (Fallback)</label>
                    <input 
                      className="input py-1.5 text-sm" 
                      value={newEmoji} 
                      onChange={(e) => setNewEmoji(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={newColor} 
                        onChange={(e) => setNewColor(e.target.value)} 
                        className="w-8 h-8 rounded cursor-pointer" 
                      />
                      <span className="text-[10px] font-mono text-slate-400">{newColor}</span>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">Preview:</p>
                  <BadgeChip badge={{ 
                    id: 'preview', 
                    name: newName || 'Badge Name', 
                    iconEmoji: newEmoji, 
                    iconUrl: newFile ? URL.createObjectURL(newFile) : undefined,
                    color: newColor 
                  }} size="sm" />
                </div>
              </div>
            )}
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
            disabled={(awardType === 'existing' ? !selectedBadgeId : !newName.trim()) || saving}
            onClick={handleAward}
          >
            {saving ? 'Awarding...' : 'Award Badge'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
