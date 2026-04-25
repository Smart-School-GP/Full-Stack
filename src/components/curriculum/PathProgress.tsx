'use client'

interface ModuleProgress {
  moduleId: string
  title: string
  totalItems: number
  completedItems: number
  isUnlocked: boolean
}

interface PathProgressProps {
  pathTitle: string
  totalItems: number
  completedItems: number
  modules: ModuleProgress[]
  xpReward?: number
}

export default function PathProgress({ pathTitle, totalItems, completedItems, modules, xpReward }: PathProgressProps) {
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">{pathTitle}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {completedItems} / {totalItems} items completed
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{overallPct}%</span>
          {xpReward && overallPct === 100 && (
            <p className="text-xs text-amber-500">+{xpReward} XP earned!</p>
          )}
        </div>
      </div>

      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-700"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      <div className="space-y-2">
        {modules.map((mod) => {
          const pct = mod.totalItems > 0 ? Math.round((mod.completedItems / mod.totalItems) * 100) : 0
          return (
            <div key={mod.moduleId} className={`flex items-center gap-3 ${!mod.isUnlocked ? 'opacity-50' : ''}`}>
              <span className="text-sm">{mod.isUnlocked ? (pct === 100 ? '✅' : '📂') : '🔒'}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{mod.title}</span>
                  <span className="text-slate-400 flex-shrink-0 ml-2">{mod.completedItems}/{mod.totalItems}</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
