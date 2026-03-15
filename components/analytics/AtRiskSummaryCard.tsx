'use client'

interface AtRiskSummaryCardProps {
  summary: string | null
  highRisk: number
  mediumRisk: number
  highRiskChange?: number
  loading?: boolean
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-slate-200 rounded w-full" />
      <div className="h-4 bg-slate-200 rounded w-3/4" />
    </div>
  )
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-slate-400 font-medium">→ No change</span>
  if (change > 0) return (
    <span className="text-xs text-red-500 font-semibold flex items-center gap-0.5">
      ▲ +{change} from last week
    </span>
  )
  return (
    <span className="text-xs text-emerald-500 font-semibold flex items-center gap-0.5">
      ▼ {change} from last week
    </span>
  )
}

export default function AtRiskSummaryCard({
  summary, highRisk, mediumRisk, highRiskChange = 0, loading
}: AtRiskSummaryCardProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="font-semibold text-slate-800">At-Risk Summary</h2>
      </div>

      {loading ? <Skeleton /> : (
        <>
          {summary && (
            <p className="text-slate-600 leading-relaxed mb-5">{summary}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-red-500">High Risk</p>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <p className="text-3xl font-bold text-red-600">{highRisk}</p>
              <div className="mt-1">
                <TrendBadge change={highRiskChange} />
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-amber-600">Medium Risk</p>
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{mediumRisk}</p>
              <p className="text-xs text-amber-500 mt-1">Monitor closely</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
