'use client'

import { useState } from 'react'

interface RecommendedActionsProps {
  actions: string[]
  loading?: boolean
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-5 h-5 bg-slate-200 rounded flex-shrink-0" />
          <div className="h-4 bg-slate-200 rounded flex-1" />
        </div>
      ))}
    </div>
  )
}

export default function RecommendedActions({ actions, loading }: RecommendedActionsProps) {
  const [done, setDone] = useState<Record<number, boolean>>({})

  const toggle = (i: number) => setDone(prev => ({ ...prev, [i]: !prev[i] }))

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Recommended Actions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {actions.filter((_, i) => done[i]).length}/{actions.length} completed
          </p>
        </div>
      </div>

      {loading ? <Skeleton /> : actions.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">No actions generated yet.</p>
      ) : (
        <ol className="space-y-3">
          {actions.map((action, i) => (
            <li
              key={i}
              onClick={() => toggle(i)}
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all
                ${done[i] ? 'bg-slate-50 opacity-60' : 'bg-emerald-50/50 hover:bg-emerald-50'}`}
            >
              {/* Custom checkbox */}
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors
                ${done[i] ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-300 bg-white'}`}>
                {done[i] && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide mr-2">
                  #{i + 1}
                </span>
                <span className={`text-sm text-slate-700 ${done[i] ? 'line-through text-slate-400' : ''}`}>
                  {action}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
