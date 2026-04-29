'use client'

interface Badge {
  id: string
  name: string
  description?: string
  iconEmoji?: string
  iconUrl?: string
  color?: string
  criteriaType?: string
}

interface BadgeChipProps {
  badge: Badge
  earned?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function BadgeChip({ badge, earned = true, size = 'md' }: BadgeChipProps) {
  const sizeRooms = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  }

  return (
    <div
      title={badge.description || badge.name}
      className={`inline-flex items-center rounded-full font-medium transition-all ${sizeRooms[size]} ${
        earned
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white shadow-sm hover:shadow-md'
          : 'bg-slate-100 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 opacity-60'
      }`}
      style={earned && badge.color ? { borderColor: badge.color + '60', backgroundColor: badge.color + '10' } : undefined}
    >
      {badge.iconUrl ? (
        <img 
          src={badge.iconUrl} 
          alt={badge.name} 
          className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} object-contain`} 
        />
      ) : (
        <span>{badge.iconEmoji || '🏅'}</span>
      )}
      <span style={earned && badge.color ? { color: badge.color } : undefined}>
        {badge.name}
      </span>
    </div>
  )
}
