'use client'

const TYPE_ICON: Record<string, string> = {
  video: '🎬',
  reading: '📖',
  quiz: '📝',
  assignment: '✏️',
  resource: '📎',
}

interface PathItemProps {
  item: {
    id: string
    title: string
    description?: string
    itemType: string
    contentUrl?: string
    durationMinutes?: number
    orderIndex: number
    isRequired: boolean
  }
  completed?: boolean
  locked?: boolean
  onComplete?: (itemId: string) => void
  dragHandle?: React.ReactNode
  isEditing?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export default function PathItem({
  item,
  completed,
  locked,
  onComplete,
  dragHandle,
  isEditing,
  onEdit,
  onDelete,
}: PathItemProps) {
  const icon = TYPE_ICON[item.itemType] || '📌'

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        locked
          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
          : completed
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600'
      }`}
    >
      {dragHandle}

      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm bg-slate-100 dark:bg-slate-700">
        {locked ? '🔒' : completed ? '✅' : icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${locked ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>
          {item.title}
          {!item.isRequired && (
            <span className="ml-2 text-[10px] text-slate-400 font-normal">Optional</span>
          )}
        </p>
        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
        )}
        {item.durationMinutes && (
          <p className="text-[10px] text-slate-400 mt-0.5">⏱ {item.durationMinutes} min</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {isEditing ? (
          <>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                ✕
              </button>
            )}
          </>
        ) : (
          !locked && !completed && onComplete && (
            <button
              onClick={() => onComplete(item.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Complete
            </button>
          )
        )}
        {completed && !isEditing && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Done</span>
        )}
      </div>
    </div>
  )
}
