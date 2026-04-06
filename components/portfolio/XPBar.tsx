'use client'

interface XPBarProps {
  totalXP: number
  level: number
  currentXP: number
  requiredXP: number
  percentage: number
  currentStreak?: number
  compact?: boolean
}

export default function XPBar({ totalXP, level, currentXP, requiredXP, percentage, currentStreak, compact }: XPBarProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Lv.{level}</span>
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{totalXP} XP</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {level}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Level {level}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{totalXP.toLocaleString()} total XP</p>
          </div>
        </div>
        {currentStreak !== undefined && currentStreak > 0 && (
          <div className="flex items-center gap-1 text-amber-500">
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold">{currentStreak}</span>
            <span className="text-xs text-slate-400">day streak</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>{currentXP} XP</span>
          <span>{requiredXP} XP to level {level + 1}</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
