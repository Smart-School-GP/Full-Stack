'use client'

import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res: any = await api.get('/api/notifications')
      const data = res.data?.notifications ? res.data : res.notifications ? res : res.data;
      
      if (data) {
        setNotifications(data.notifications || [])
        setUnread(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id: string) => {
    await api.put(`/api/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnread((prev) => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await api.put('/api/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
  }

  const typeIcon: Record<string, string> = {
    risk_alert: '⚠️',
    meeting_invite: '📅',
    meeting_cancelled: '❌',
    grade_update: '📊',
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          open 
            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 ring-2 ring-red-500/20">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 md:left-auto md:right-0 top-full mt-3 w-85 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-slate-700/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-right">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Notifications</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                {unread} unread messages
              </p>
            </div>
            {unread > 0 && (
              <button 
                onClick={markAllRead} 
                className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors px-2 py-1 rounded-lg hover:bg-brand-500/10"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-700/30">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">All caught up!</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">No new notifications to show.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) markRead(n.id) }}
                  className={`px-5 py-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/40 relative group ${
                    !n.isRead ? 'bg-brand-50/30 dark:bg-brand-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border border-slate-100 dark:border-slate-700/50 ${
                      !n.isRead ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900/50'
                    }`}>
                      {typeIcon[n.type] || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold truncate ${n.isRead ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-white'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${n.isRead ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {n.body}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700/50 text-center">
              <button className="text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-brand-500 transition-colors uppercase tracking-widest">
                View All Activity
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
