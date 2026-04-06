'use client'

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  project:     { icon: '🚀', color: 'text-blue-600 dark:text-blue-400' },
  essay:       { icon: '📄', color: 'text-emerald-600 dark:text-emerald-400' },
  artwork:     { icon: '🎨', color: 'text-purple-600 dark:text-purple-400' },
  certificate: { icon: '🏆', color: 'text-amber-600 dark:text-amber-400' },
  achievement: { icon: '⭐', color: 'text-yellow-600 dark:text-yellow-400' },
  other:       { icon: '📁', color: 'text-slate-600 dark:text-slate-400' },
}

interface PortfolioItem {
  id: string
  title: string
  description?: string
  type: string
  fileUrl?: string
  thumbnailUrl?: string
  isPublic: boolean
  subject?: { name: string }
  createdAt: string
}

interface PortfolioCardProps {
  item: PortfolioItem
  isOwn?: boolean
  onDelete?: (id: string) => void
  onTogglePublic?: (id: string, isPublic: boolean) => void
}

export default function PortfolioCard({ item, isOwn, onDelete, onTogglePublic }: PortfolioCardProps) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other

  return (
    <div className="card group overflow-hidden flex flex-col">
      {/* Thumbnail or placeholder */}
      {item.thumbnailUrl ? (
        <div className="h-40 -mx-4 -mt-4 mb-4 overflow-hidden bg-slate-100 dark:bg-slate-700">
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-32 -mx-4 -mt-4 mb-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
          <span className="text-4xl">{cfg.icon}</span>
        </div>
      )}

      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm leading-tight line-clamp-2">
            {item.title}
          </h3>
          {!item.isPublic && (
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded flex-shrink-0">
              Private
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span className={cfg.color}>{cfg.icon} {item.type}</span>
          {item.subject && (
            <>
              <span>·</span>
              <span>{item.subject.name}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        {item.fileUrl && (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-1.5 px-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors font-medium"
          >
            View File
          </a>
        )}

        {isOwn && (
          <>
            {onTogglePublic && (
              <button
                onClick={() => onTogglePublic(item.id, !item.isPublic)}
                className="text-xs py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title={item.isPublic ? 'Make private' : 'Make public'}
              >
                {item.isPublic ? '🔓' : '🔒'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="text-xs py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                title="Delete"
              >
                🗑️
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
