'use client'

import { useState, useEffect } from 'react'
import { savePendingAttendance, getPendingAttendance, syncPendingData } from '@/lib/offlineStorage'

interface UseOfflineOptions {
  autoSync?: boolean
  onSyncComplete?: (result: { success: boolean; synced: number; failed: number }) => void
}

export function useOfflineSync(options: UseOfflineOptions = {}) {
  const { autoSync = true, onSyncComplete } = options
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (autoSync) {
        handleSync()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    checkPendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [autoSync])

  const checkPendingCount = async () => {
    const pending = await getPendingAttendance()
    setPendingCount(pending.length)
  }

  const handleSync = async () => {
    if (isSyncing || !navigator.onLine) return

    setIsSyncing(true)
    try {
      const result = await syncPendingData()
      await checkPendingCount()
      onSyncComplete?.(result)
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const saveOfflineAttendance = async (data: {
    studentId: string
    classId: string
    date: string
    status: string
    markedBy: string
    schoolId: string
  }) => {
    await savePendingAttendance(data)
    await checkPendingCount()
  }

  return {
    isOnline,
    isSyncing,
    pendingCount,
    sync: handleSync,
    saveOfflineAttendance,
    checkPendingCount,
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
