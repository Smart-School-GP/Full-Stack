interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
}

export default function StatCard({ title, value, subtitle, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="card flex items-start gap-4">
      {icon && (
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
