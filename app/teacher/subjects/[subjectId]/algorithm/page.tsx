'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

interface WeightEntry {
  type: string
  weight: string
}

export default function AlgorithmConfigPage() {
  const { subjectId } = useParams()
  const router = useRouter()
  const [subject, setSubject] = useState<any>(null)
  const [weights, setWeights] = useState<WeightEntry[]>([{ type: '', weight: '' }])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const COMMON_TYPES = ['exam', 'quiz', 'homework', 'project', 'participation', 'midterm', 'final']

  useEffect(() => {
    if (subjectId) loadSubject()
  }, [subjectId])

  const loadSubject = async () => {
    try {
      const res = await api.get(`/api/teacher/subjects/${subjectId}`)
      setSubject(res.data)
      if (res.data.gradingAlgorithm?.weights) {
        const w = parseWeights(res.data.gradingAlgorithm.weights)
        const entries = Object.entries(w).map(([type, weight]) => ({
          type,
          weight: String(weight),
        }))
        if (entries.length > 0) setWeights(entries)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const parseWeights = (w: any): Record<string, number> => {
    if (!w) return {}
    if (typeof w === 'string') { try { return JSON.parse(w) } catch { return {} } }
    return w as Record<string, number>
  }

  const totalWeight = weights.reduce((sum, e) => sum + (parseFloat(e.weight) || 0), 0)
  const isValid = Math.abs(totalWeight - 1.0) < 1e-9

  const handleTypeChange = (index: number, value: string) => {
    setWeights((prev) => prev.map((e, i) => i === index ? { ...e, type: value } : e))
    setError('')
  }

  const handleWeightChange = (index: number, value: string) => {
    setWeights((prev) => prev.map((e, i) => i === index ? { ...e, weight: value } : e))
    setError('')
  }

  const addRow = () => {
    setWeights((prev) => [...prev, { type: '', weight: '' }])
  }

  const removeRow = (index: number) => {
    if (weights.length === 1) return
    setWeights((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const filled = weights.filter((e) => e.type.trim() && e.weight)
    if (filled.length === 0) {
      setError('Add at least one grade type.')
      return
    }

    const hasDuplicates = new Set(filled.map((e) => e.type.toLowerCase())).size !== filled.length
    if (hasDuplicates) {
      setError('Duplicate grade types are not allowed.')
      return
    }

    if (!isValid) {
      setError(`Weights must sum to exactly 1.0. Current sum: ${totalWeight.toFixed(4)}`)
      return
    }

    const weightsObj: Record<string, number> = {}
    filled.forEach((e) => { weightsObj[e.type.trim()] = parseFloat(e.weight) })

    setSaving(true)
    try {
      await api.put(`/api/teacher/subjects/${subjectId}/algorithm`, { weights: weightsObj })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save algorithm')
    } finally {
      setSaving(false)
    }
  }

  const distributeEvenly = () => {
    const filled = weights.filter((e) => e.type.trim())
    if (filled.length === 0) return
    const even = (1 / filled.length).toFixed(4)
    setWeights((prev) => prev.map((e) => e.type.trim() ? { ...e, weight: even } : e))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.push(`/teacher/subjects/${subjectId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {subject?.name || 'Subject'}
        </button>

        <div className="card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Grading Algorithm</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {subject?.name} — Define how different assignment types contribute to the final grade
            </p>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl mb-6">
            <svg className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-brand-800 dark:text-brand-200">
              <p className="font-medium mb-0.5">How this works</p>
              <p className="text-brand-600 dark:text-brand-300 text-xs">
                Each weight is a decimal between 0 and 1. All weights must sum to exactly 1.0.
                Example: exam=0.50, quiz=0.30, homework=0.20
              </p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {/* Quick templates */}
            <div className="mb-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Quick templates</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Standard', weights: [{ type: 'exam', weight: '0.50' }, { type: 'quiz', weight: '0.30' }, { type: 'homework', weight: '0.20' }] },
                  { label: 'Project-based', weights: [{ type: 'project', weight: '0.60' }, { type: 'quiz', weight: '0.25' }, { type: 'participation', weight: '0.15' }] },
                  { label: 'Midterm + Final', weights: [{ type: 'midterm', weight: '0.30' }, { type: 'final', weight: '0.50' }, { type: 'homework', weight: '0.20' }] },
                ].map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => setWeights(tpl.weights)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={distributeEvenly}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Distribute evenly
                </button>
              </div>
            </div>

            {/* Weight rows */}
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-[1fr,120px,40px] gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
                <span>Grade Type</span>
                <span>Weight</span>
                <span />
              </div>
              {weights.map((entry, index) => (
                <div key={index} className="grid grid-cols-[1fr,120px,40px] gap-2 items-center">
                  <div className="relative">
                    <input
                      type="text"
                      value={entry.type}
                      onChange={(e) => handleTypeChange(index, e.target.value)}
                      placeholder="e.g. exam, quiz..."
                      list={`types-${index}`}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    />
                    <datalist id={`types-${index}`}>
                      {COMMON_TYPES.filter((t) => !weights.some((w, i) => i !== index && w.type === t)).map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                  <input
                    type="number"
                    value={entry.weight}
                    onChange={(e) => handleWeightChange(index, e.target.value)}
                    placeholder="0.00"
                    min={0}
                    max={1}
                    step={0.01}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={weights.length === 1}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Remove row"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mb-5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add grade type
            </button>

            {/* Weight total */}
            <div className={`flex items-center justify-between p-3 rounded-xl mb-5 ${
              isValid
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <span className={`text-sm font-medium ${isValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                Total weight
              </span>
              <span className={`text-lg font-bold ${isValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {totalWeight.toFixed(4)}
                {isValid ? ' ✓' : ' (must be 1.0)'}
              </span>
            </div>

            {/* Visual breakdown */}
            {weights.some((e) => e.type && e.weight) && (
              <div className="mb-5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Grade breakdown</p>
                <div className="flex rounded-xl overflow-hidden h-6">
                  {weights.filter((e) => e.type && e.weight).map((e, i) => {
                    const pct = ((parseFloat(e.weight) || 0) / Math.max(totalWeight, 1)) * 100
                    const colors = ['bg-brand-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500']
                    return (
                      <div
                        key={i}
                        className={`${colors[i % colors.length]} flex items-center justify-center text-white text-[10px] font-medium`}
                        style={{ width: `${pct}%` }}
                        title={`${e.type}: ${(pct).toFixed(0)}%`}
                      >
                        {pct > 8 ? e.type : ''}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {weights.filter((e) => e.type && e.weight).map((e, i) => {
                    const colors = ['text-brand-600 dark:text-brand-400', 'text-emerald-600 dark:text-emerald-400', 'text-amber-600 dark:text-amber-400', 'text-purple-600 dark:text-purple-400', 'text-pink-600 dark:text-pink-400', 'text-cyan-600 dark:text-cyan-400']
                    return (
                      <span key={i} className={`text-xs ${colors[i % colors.length]}`}>
                        {e.type}: {((parseFloat(e.weight) || 0) * 100).toFixed(0)}%
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/teacher/subjects/${subjectId}`)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !isValid}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : saved ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </span>
                ) : 'Save Algorithm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
