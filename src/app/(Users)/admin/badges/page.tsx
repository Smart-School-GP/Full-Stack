'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import BadgeChip from '@/components/portfolio/BadgeChip'

interface BadgeDefinition {
  id: string
  name: string
  description?: string
  iconEmoji?: string
  iconUrl?: string
  color?: string
  criteriaType: string
  criteriaValue: number
  pointsValue: number
  isActive: boolean
  awardCount?: number
}

const CRITERIA_TYPES = [
  { value: 'grade_average', label: 'Grade Average ≥ X%' },
  { value: 'attendance_rate', label: 'Attendance Rate ≥ X%' },
  { value: 'path_completion', label: 'Learning Paths Completed ≥ X' },
  { value: 'discussion_participation', label: 'Discussion Posts ≥ X' },
  { value: 'streak', label: 'Login Streak ≥ X days' },
]

const emptyForm = {
  name: '', description: '', iconEmoji: '🏅', color: '#6366f1',
  criteriaType: 'grade_average', criteriaValue: 90, pointsValue: 50, isActive: true,
}

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<BadgeDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchBadges = () => {
    api.get('/api/badges/school')
      .then((r) => setBadges(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBadges() }, [])

  const openCreate = () => {
    setEditingBadge(null)
    setForm({ ...emptyForm })
    setIconFile(null)
    setShowForm(true)
  }

  const openEdit = (badge: BadgeDefinition) => {
    setEditingBadge(badge)
    setForm({
      name: badge.name,
      description: badge.description || '',
      iconEmoji: badge.iconEmoji || '🏅',
      color: badge.color || '#6366f1',
      criteriaType: badge.criteriaType,
      criteriaValue: badge.criteriaValue,
      pointsValue: badge.pointsValue,
      isActive: badge.isActive,
    })
    setIconFile(null)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        formData.append(key, String(val))
      })
      if (iconFile) {
        formData.append('icon', iconFile)
      }

      if (editingBadge) {
        await api.put(`/api/badges/${editingBadge.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post('/api/badges', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      setShowForm(false)
      fetchBadges()
    } catch (err: any) {
      const apiError = err.response?.data?.error
      alert(typeof apiError === 'string' ? apiError : apiError?.message || 'Failed to save badge')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this badge definition?')) return
    await api.delete(`/api/badges/${id}`)
    fetchBadges()
  }

  const handleToggle = async (badge: BadgeDefinition) => {
    await api.put(`/api/badges/${badge.id}`, { isActive: !badge.isActive })
    fetchBadges()
  }

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Badge Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{badges.filter((b) => b.isActive).length} active badges</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New Badge</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 card animate-pulse bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : badges.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🏅</p>
          <p className="text-slate-500 dark:text-slate-400">No badges defined yet</p>
          <button onClick={openCreate} className="btn-primary mt-4 text-sm">Create First Badge</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.map((badge) => {
            const criteria = CRITERIA_TYPES.find((c) => c.value === badge.criteriaType)
            return (
              <div key={badge.id} className={`card ${!badge.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <BadgeChip badge={badge} size="lg" />
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggle(badge)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        badge.isActive
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                      }`}
                    >
                      {badge.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => openEdit(badge)} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Edit</button>
                    <button onClick={() => handleDelete(badge.id)} className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-500">Del</button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  {badge.description && <p>{badge.description}</p>}
                  <p>🎯 {criteria?.label.replace('X', String(badge.criteriaValue))}</p>
                  <p>⚡ +{badge.pointsValue} XP on award</p>
                  {badge.awardCount !== undefined && (
                    <p>🎖️ Awarded to {badge.awardCount} students</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              {editingBadge ? 'Edit Badge' : 'New Badge'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Emoji (Fallback)</label>
                  <input className="input" placeholder="🏅" value={form.iconEmoji} onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-9 h-9 rounded cursor-pointer" />
                    <span className="text-xs text-slate-400">{form.color}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Upload Icon Image (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="input text-xs" 
                  onChange={(e) => setIconFile(e.target.files?.[0] || null)} 
                />
              </div>
              <input className="input" placeholder="Badge name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <textarea className="input" placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Criteria Type</label>
                <select className="input" value={form.criteriaType} onChange={(e) => setForm({ ...form, criteriaType: e.target.value })}>
                  {CRITERIA_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Threshold Value</label>
                  <input type="number" className="input" value={form.criteriaValue} onChange={(e) => setForm({ ...form, criteriaValue: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">XP Reward</label>
                  <input type="number" className="input" value={form.pointsValue} onChange={(e) => setForm({ ...form, pointsValue: parseInt(e.target.value) })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                Active (auto-award when criteria met)
              </label>

              {/* Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">Preview:</p>
                <BadgeChip badge={{ 
                  id: 'preview', 
                  name: form.name || 'Badge Name', 
                  iconEmoji: form.iconEmoji, 
                  iconUrl: iconFile ? URL.createObjectURL(iconFile) : editingBadge?.iconUrl,
                  color: form.color 
                }} />
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
