'use client'

import { useOfflineSync } from '@/lib/useOfflineSync'

export default function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, sync } = useOfflineSync()

  if (isOnline && pendingCount === 0) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 transition-colors flex items-center justify-center gap-3 text-sm font-medium ${
      !isOnline ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
    }`}>
      {!isOnline ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0-12.728L5.636 18.364m12.728-12.728L5.636 5.636m12.728 12.728L5.636 18.364" />
          </svg>
          <span>You are currently offline. Changes will be saved locally.</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{pendingCount} item(s) pending sync.</span>
          <button 
            onClick={() => sync()} 
            disabled={isSyncing}
            className="underline hover:no-underline disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </>
      )}
    </div>
  )
}
