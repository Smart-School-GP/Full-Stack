'use client'

import { useEffect, useRef, useState } from 'react'

interface VideoCallProps {
  roomUrl: string
  onLeave?: () => void
}

export default function VideoCall({ roomUrl, onLeave }: VideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callFrameRef = useRef<any>(null)
  const [status, setStatus] = useState<'loading' | 'joined' | 'left' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return

    let frame: any

    const loadDaily = async () => {
      try {
        // Dynamically import @daily-co/daily-js (browser only)
        const DailyIframe = (await import('@daily-co/daily-js')).default

        frame = DailyIframe.createFrame(containerRef.current!, {
          iframeStyle: {
            width: '100%',
            height: '520px',
            border: 'none',
            borderRadius: '12px',
          },
          showLeaveButton: true,
          showFullscreenButton: true,
        })

        frame.on('joined-meeting', () => setStatus('joined'))
        frame.on('left-meeting', () => {
          setStatus('left')
          onLeave?.()
        })
        frame.on('error', (e: any) => {
          setStatus('error')
          setError(e?.errorMsg || 'Call error')
        })

        await frame.join({ url: roomUrl })
        callFrameRef.current = frame
      } catch (err: any) {
        setStatus('error')
        setError(err.message || 'Failed to load video call')
      }
    }

    loadDaily()

    return () => {
      try {
        frame?.destroy()
      } catch {}
    }
  }, [roomUrl])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border border-red-200 text-red-600">
        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="font-medium">Failed to connect</p>
        <p className="text-sm opacity-75 mt-1">{error}</p>
        <a href={roomUrl} target="_blank" rel="noreferrer"
          className="mt-3 text-sm underline">
          Open room in new tab
        </a>
      </div>
    )
  }

  if (status === 'left') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
        <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7" />
        </svg>
        <p className="font-medium">You've left the call</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-brand-500 text-sm underline">
          Rejoin
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Connecting to video call…</p>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', minHeight: '520px' }} />
    </div>
  )
}
