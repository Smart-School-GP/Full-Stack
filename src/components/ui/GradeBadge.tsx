interface GradeBadgeProps {
  score: number | null
  letterGrade?: string | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function getGradeColor(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500'
  if (score >= 90) return 'bg-emerald-500 text-white shadow-sm'
  if (score >= 75) return 'bg-brand-500 text-white shadow-sm'
  if (score >= 60) return 'bg-amber-500 text-white shadow-sm'
  if (score >= 50) return 'bg-orange-500 text-white shadow-sm'
  return 'bg-red-500 text-white shadow-sm'
}

function getGradeLetter(score: number | null): string {
  if (score === null) return '—'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

const sizeMap = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-3 py-1',
  lg: 'text-sm px-4 py-1.5',
}

export default function GradeBadge({ score, letterGrade, showLabel = true, size = 'md' }: GradeBadgeProps) {
  const displayLetter = letterGrade || getGradeLetter(score);
  const isPassing = score !== null && score >= 50;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wider ${getGradeColor(score)} ${sizeMap[size]}`}>
        {score !== null ? `${score.toFixed(1)}%` : '—'}
        {showLabel && (
          <span className="opacity-80 border-l border-white/30 pl-1.5">{displayLetter}</span>
        )}
      </span>
      {size !== 'sm' && score !== null && (
        <span className={`text-[9px] font-bold uppercase tracking-widest ${isPassing ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPassing ? 'Passing' : 'Failing'}
        </span>
      )}
    </div>
  )
}

export { getGradeColor, getGradeLetter }
