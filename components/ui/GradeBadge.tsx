interface GradeBadgeProps {
  score: number | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function getGradeColor(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500'
  if (score >= 90) return 'bg-emerald-100 text-emerald-700'
  if (score >= 75) return 'bg-blue-100 text-blue-700'
  if (score >= 60) return 'bg-amber-100 text-amber-700'
  if (score >= 50) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function getGradeLetter(score: number | null): string {
  if (score === null) return 'N/A'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export default function GradeBadge({ score, showLabel = false, size = 'md' }: GradeBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${getGradeColor(score)} ${sizeMap[size]}`}>
      {score !== null ? `${score.toFixed(1)}%` : 'N/A'}
      {showLabel && score !== null && (
        <span className="font-bold">{getGradeLetter(score)}</span>
      )}
    </span>
  )
}

export { getGradeColor, getGradeLetter }
