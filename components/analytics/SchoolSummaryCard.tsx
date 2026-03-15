'use client'

interface SchoolSummaryCardProps {
  summary: string | null
  generatedAt: string | null
  loading?: boolean
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-slate-200 rounded w-full" />
      <div className="h-4 bg-slate-200 rounded w-5/6" />
      <div className="h-4 bg-slate-200 rounded w-4/6" />
    </div>
  )
}

export default function SchoolSummaryCard({ summary, generatedAt, loading }: SchoolSummaryCardProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">School Health Summary</h2>
          {generatedAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              Generated {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="ml-auto">
          <span className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded-full font-medium">
            AI Generated
          </span>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : summary ? (
        <p className="text-slate-600 leading-relaxed">{summary}</p>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <p className="text-sm">No report generated yet.</p>
          <p className="text-xs mt-1">Click "Refresh Report" to generate your first analytics report.</p>
        </div>
      )}
    </div>
  )
}
