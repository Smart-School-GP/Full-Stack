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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-brand-400 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-xl border border-white/20">
              {level}
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-slate-800 dark:text-white leading-none mb-1">Level {level}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{totalXP.toLocaleString()} Total XP</p>
          </div>
        </div>
        {currentStreak !== undefined && currentStreak > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/50">
            <span className="text-xl">🔥</span>
            <div className="leading-tight">
              <p className="text-sm font-black text-amber-600">{currentStreak} Day</p>
              <p className="text-[10px] font-bold text-amber-500/70 uppercase">Streak</p>
            </div>
          </div>
        )}
      </div>

      <div className="relative pt-2">
        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <span>{currentXP} XP EARNED</span>
          <span>{requiredXP - currentXP} XP TO NEXT LEVEL</span>
        </div>
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-brand-500 via-purple-500 to-brand-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
