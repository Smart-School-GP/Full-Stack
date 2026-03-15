'use client'

import { useEffect, useRef } from 'react'

interface ChartData {
  labels: string[]
  averages: number[]
  trends: string[]
}

interface SchoolPerformanceChartProps {
  data: ChartData
  loading?: boolean
}

function Skeleton() {
  return (
    <div className="animate-pulse flex items-end gap-2 h-48 px-4">
      {[65, 80, 55, 72, 90, 48, 76].map((h, i) => (
        <div key={i} className="flex-1 bg-slate-200 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

export default function SchoolPerformanceChart({ data, loading }: SchoolPerformanceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (loading || !data.labels.length || !canvasRef.current) return

    const init = async () => {
      const { Chart, registerables } = await import('chart.js')
      Chart.register(...registerables)

      // Destroy previous instance
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }

      const colors = data.averages.map(avg =>
        avg >= 75 ? 'rgba(16, 185, 129, 0.8)' :
        avg >= 50 ? 'rgba(245, 158, 11, 0.8)' :
                   'rgba(239, 68, 68, 0.8)'
      )
      const borders = data.averages.map(avg =>
        avg >= 75 ? 'rgb(16, 185, 129)' :
        avg >= 50 ? 'rgb(245, 158, 11)' :
                   'rgb(239, 68, 68)'
      )

      chartRef.current = new Chart(canvasRef.current!, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Average Score (%)',
            data: data.averages,
            backgroundColor: colors,
            borderColor: borders,
            borderWidth: 2,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.parsed.y.toFixed(1)}%`,
                afterLabel: (ctx) => {
                  const trend = data.trends[ctx.dataIndex]
                  return trend ? `Trend: ${trend}` : ''
                },
              },
            },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: {
                callback: v => `${v}%`,
                font: { size: 11 },
                color: '#94a3b8',
              },
              grid: { color: 'rgba(148, 163, 184, 0.1)' },
            },
            x: {
              ticks: {
                font: { size: 10 },
                color: '#94a3b8',
                maxRotation: 45,
              },
              grid: { display: false },
            },
          },
        },
      })
    }

    init()

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, loading])

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-800">Subject Performance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Average scores across all subjects</p>
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" />≥ 75%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500" />50–74%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500" />{'< 50%'}
          </span>
        </div>
      </div>

      {loading ? <Skeleton /> : data.labels.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No subject data available yet.
        </div>
      ) : (
        <div style={{ height: '280px' }}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  )
}
