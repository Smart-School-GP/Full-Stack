'use client'

interface RiskBadgeProps {
  level: 'high' | 'medium' | 'low'
  score?: number
  showScore?: boolean
  size?: 'sm' | 'md'
}

const CONFIG = {
  high: {
    label: 'High Risk',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    pulse: true,
  },
  medium: {
    label: 'Medium Risk',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    pulse: false,
  },
  low: {
    label: 'Low Risk',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    pulse: false,
  },
}

export default function RiskBadge({ level, score, showScore = false, size = 'sm' }: RiskBadgeProps) {
  const cfg = CONFIG[level] || CONFIG.low
  const padding = size === 'md' ? 'px-3 py-1.5' : 'px-2 py-0.5'
  const textSize = size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full font-medium border
        ${cfg.bg} ${cfg.text} ${cfg.border} ${textSize}`}
    >
      <span className="relative flex h-2 w-2">
        {cfg.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
      </span>
      {cfg.label}
      {showScore && score !== undefined && (
        <span className="opacity-70">({(score * 100).toFixed(0)}%)</span>
      )}
    </span>
  )
}
