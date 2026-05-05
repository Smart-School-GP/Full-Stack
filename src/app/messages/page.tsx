'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import io, { Socket } from 'socket.io-client'
import DashboardLayout from '@/components/ui/DashboardLayout'
import Link from 'next/link'

let socket: Socket | null = null

function initials(name: string) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString()
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    loadConversations()
    initSocket()
    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      if (socket) {
        socket.emit('join_conversation', selectedConversation.id)
      }
    }
  }, [selectedConversation?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const initSocket = () => {
    const token = localStorage.getItem('token')
    if (!token) return

    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
    })

    socket.on('new_message', (message: any) => {
      setMessages((prev) => {
        if (selectedConversation && message.conversationId === selectedConversation.id) {
           // check dedupe
           if (prev.some(m => m.id === message.id)) return prev
           return [...prev, message]
        }
        return prev
      })
      loadConversations()
    })

    socket.on('message_notification', () => {
      loadConversations()
    })
  }

  const loadConversations = () => {
    api.get('/api/messages/conversations')
      .then((res) => {
        const data = res.data?.data || res.data || []
        setConversations(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await api.get(`/api/messages/conversations/${conversationId}/messages`)
      const data = res.data?.data || res.data || []
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const body = newMessage
    setNewMessage('')
    setSending(true)
    try {
      const res = await api.post(`/api/messages/conversations/${selectedConversation.id}/messages`, {
        body,
      })
      const sent = res.data?.data || res.data
      if (sent) {
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]))
      }
    } catch (err) {
      console.error(err)
      setNewMessage(body)
    } finally {
      setSending(false)
    }
  }

  const getOtherParty = (conv: any) => {
    if (user?.role === 'teacher') {
      return { name: conv.parent?.name || 'Parent', role: 'Parent' }
    }
    return { name: conv.teacher?.name || 'Teacher', role: 'Teacher' }
  }

  const filteredConversations = useMemo(() => {
    const q = search.toLowerCase()
    return conversations.filter(c => {
      const other = getOtherParty(c)
      return other.name.toLowerCase().includes(q) || 
             c.student?.name?.toLowerCase().includes(q) ||
             c.lastMessage?.body?.toLowerCase().includes(q)
    })
  }, [conversations, search, user])

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Direct communication with parents about their children.
            </p>
          </div>
          {/* Back button for desktop (to dashboard) */}
          <Link href="/teacher/dashboard" className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand-500 transition-colors uppercase tracking-widest">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             Back
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4 flex-1 h-[calc(100vh-180px)] overflow-hidden">
          {/* Sidebar */}
          <aside className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col overflow-hidden ${
            selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
               <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                  <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-all"
                  />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading your inbox...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-sm">No conversations found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {filteredConversations.map((conv) => {
                    const other = getOtherParty(conv)
                    const isActive = selectedConversation?.id === conv.id
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 flex items-start gap-4 ${
                          isActive ? 'bg-brand-50 dark:bg-brand-900/20 border-l-4 border-brand-500' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/10 flex-shrink-0">
                          {initials(other.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{other.name}</p>
                            {conv.unreadCount > 0 && (
                              <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-brand-500 uppercase tracking-widest mt-0.5">
                            {conv.student?.name}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                              {conv.lastMessage.body}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Chat Pane */}
          <main className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col overflow-hidden relative ${
            !selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}>
            {!selectedConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-6">
                   <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Your Workspace Inbox</h3>
                <p className="text-sm text-slate-400 max-w-xs mt-2">Select a parent from the list to view the conversation history and start chatting.</p>
              </div>
            ) : (
              <>
                <header className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 z-10">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/10">
                       {initials(getOtherParty(selectedConversation).name)}
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800 dark:text-white">
                        {getOtherParty(selectedConversation).name}
                      </h2>
                      <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">
                        Student: {selectedConversation.student?.name}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                     <button className="p-2 text-slate-400 hover:text-brand-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                     </button>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/30 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="text-center py-20">
                       <p className="text-xs text-slate-400 italic">No messages in this thread yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const mine = msg.senderId === user?.id
                      const nextMine = messages[idx + 1]?.senderId === user?.id
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all hover:shadow-md ${
                                mine
                                  ? 'bg-brand-600 text-white rounded-br-none'
                                  : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600 rounded-bl-none'
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                              {msg.attachmentUrl && (
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`mt-2 p-2 rounded-lg bg-black/10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider group-hover:bg-black/20 transition-colors ${
                                    mine ? 'text-white' : 'text-brand-600'
                                  }`}
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  View File
                                </a>
                              )}
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tighter">
                               {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <footer className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <button className="p-2 text-slate-400 hover:text-brand-500 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        newMessage.trim() 
                          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sending ? (
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      )}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </main>
        </div>
      </div>
    </DashboardLayout>
  )
}
