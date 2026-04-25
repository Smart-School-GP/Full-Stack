'use client'

interface SubjectInsightCardProps {
  subjectName: string
  className: string
  averageScore: number | null
  trend: 'improving' | 'declining' | 'stable'
  insightText: string
}

const TREND_CONFIG = {
  improving: {
    label: 'Improving',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: '▲',
    scoreBg: 'bg-emerald-50',
    scoreText: 'text-emerald-600',
  },
  declining: {
    label: 'Declining',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '▼',
    scoreBg: 'bg-red-50',
    scoreText: 'text-red-600',
  },
  stable: {
    label: 'Stable',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: '→',
    scoreBg: 'bg-slate-50',
    scoreText: 'text-slate-600',
  },
}

export default function SubjectInsightCard({
  subjectName, className, averageScore, trend, insightText,
}: SubjectInsightCardProps) {
  const cfg = TREND_CONFIG[trend] ?? TREND_CONFIG.stable

  return (
    <div className={`card border ${cfg.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-800">{subjectName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{className}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
          <span>{cfg.icon}</span>
          {cfg.label}
        </span>
      </div>

      {averageScore !== null && (
        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg mb-3 ${cfg.scoreBg}`}>
          <span className={`text-2xl font-bold ${cfg.scoreText}`}>
            {averageScore.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 self-end mb-0.5">avg</span>
        </div>
      )}

      {/* Progress bar */}
      {averageScore !== null && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              averageScore >= 75 ? 'bg-emerald-500' :
              averageScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(averageScore, 100)}%` }}
          />
        </div>
      )}

      <p className="text-sm text-slate-600 leading-relaxed">{insightText}</p>
    </div>
  )
}
