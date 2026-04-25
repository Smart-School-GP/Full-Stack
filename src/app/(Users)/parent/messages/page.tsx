'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import io, { Socket } from 'socket.io-client'

interface TeacherEntry {
  teacher_id: string
  teacher_name: string
  teacher_email?: string | null
  child_id: string
  child_name: string
  rooms: { id: string; name: string; subjects: { id: string; name: string }[] }[]
}

interface Conversation {
  id: string
  teacherId: string
  parentId: string
  studentId: string
  lastMessageAt: string | null
  teacher?: { id: string; name: string }
  student?: { id: string; name: string }
  lastMessage?: { body: string; createdAt: string } | null
  unreadCount?: number
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  attachmentUrl?: string | null
  attachmentType?: string | null
}

function unwrap<T>(r: any): T {
  if (r && typeof r === 'object' && 'data' in r && 'success' in r) return r.data as T
  return r as T
}

function initials(name: string) {
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

export default function ParentMessagesPage() {
  const { user } = useAuth()
  const [teachers, setTeachers] = useState<TeacherEntry[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/parent/teachers').then((r: any) => setTeachers(unwrap<TeacherEntry[]>(r) ?? [])),
      api
        .get('/api/messages/conversations')
        .then((r: any) => setConversations(Array.isArray(r) ? r : r?.data ?? [])),
    ])
      .catch(() => {})
      .finally(() => setLoadingTeachers(false))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
    })
    socketRef.current = socket

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) =>
        activeConversation && msg.conversationId === activeConversation.id ? [...prev, msg] : prev
      )
      refreshConversations()
    })
    socket.on('message_notification', () => refreshConversations())

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function refreshConversations() {
    api
      .get('/api/messages/conversations')
      .then((r: any) => setConversations(Array.isArray(r) ? r : r?.data ?? []))
      .catch(() => {})
  }

  async function openConversationWith(entry: TeacherEntry) {
    setOpening(`${entry.teacher_id}:${entry.child_id}`)
    try {
      const conv = await api.post<Conversation>('/api/messages/conversations/with-teacher', {
        teacher_id: entry.teacher_id,
        student_id: entry.child_id,
      })
      const conversation = (conv as any) as Conversation
      setActiveConversation(conversation)
      socketRef.current?.emit('join_conversation', conversation.id)
      await loadMessages(conversation.id)
      refreshConversations()
    } catch {
      // silent
    } finally {
      setOpening(null)
    }
  }

  async function selectExistingConversation(conv: Conversation) {
    setActiveConversation(conv)
    socketRef.current?.emit('join_conversation', conv.id)
    await loadMessages(conv.id)
  }

  async function loadMessages(conversationId: string) {
    setLoadingMessages(true)
    try {
      const res = await api.get(`/api/messages/conversations/${conversationId}/messages`)
      const list = (res as unknown as Message[]) ?? []
      setMessages(Array.isArray(list) ? list : [])
    } finally {
      setLoadingMessages(false)
    }
  }

  async function sendMessage() {
    if (!activeConversation || !draft.trim()) return
    setSending(true)
    const body = draft
    setDraft('')
    try {
      const sent = (await api.post(
        `/api/messages/conversations/${activeConversation.id}/messages`,
        { body }
      )) as unknown as Message
      // optimistic — socket may also deliver it; dedupe by id
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]))
    } catch {
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  // Index existing conversations by teacher+student so cards reflect history
  const conversationByPair = useMemo(() => {
    const map = new Map<string, Conversation>()
    for (const c of conversations) map.set(`${c.teacherId}:${c.studentId}`, c)
    return map
  }, [conversations])

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter(
      (t) =>
        t.teacher_name.toLowerCase().includes(q) ||
        t.child_name.toLowerCase().includes(q) ||
        t.rooms.some((c) =>
          c.subjects.some((s) => s.name.toLowerCase().includes(q)) ||
          c.name.toLowerCase().includes(q)
        )
    )
  }, [teachers, search])

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Talk directly with the teachers of your children.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-180px)]">
          {/* Left column — teachers + conversations */}
          <aside className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teacher, child or subject…"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingTeachers ? (
                <div className="p-4 text-sm text-slate-400">Loading teachers…</div>
              ) : filteredTeachers.length === 0 ? (
                <div className="p-6 text-sm text-slate-400 text-center">
                  No teachers found for your children yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredTeachers.map((t) => {
                    const key = `${t.teacher_id}:${t.child_id}`
                    const existing = conversationByPair.get(key)
                    const isActive = activeConversation?.id === existing?.id
                    const subjectLabel = t.rooms
                      .flatMap((c) => c.subjects.map((s) => s.name))
                      .slice(0, 2)
                      .join(', ')
                    const unread = existing?.unreadCount ?? 0

                    return (
                      <li key={key}>
                        <button
                          onClick={() =>
                            existing ? selectExistingConversation(existing) : openConversationWith(t)
                          }
                          disabled={opening === key}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-500/10'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {initials(t.teacher_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                                {t.teacher_name}
                              </p>
                              {unread > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                                  {unread}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              About <span className="font-medium">{t.child_name}</span>
                              {subjectLabel ? ` · ${subjectLabel}` : ''}
                            </p>
                            {existing?.lastMessage ? (
                              <p className="text-xs text-slate-400 truncate mt-0.5">
                                {existing.lastMessage.body}
                              </p>
                            ) : (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {opening === key ? 'Opening…' : 'Start conversation'}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Right column — chat pane */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col overflow-hidden">
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <svg
                  className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Pick a teacher on the left to start chatting.
                </p>
              </div>
            ) : (
              <>
                <header className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-sm font-bold">
                    {initials(activeConversation.teacher?.name ?? '?')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {activeConversation.teacher?.name ?? 'Teacher'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      About {activeConversation.student?.name ?? 'your child'}
                    </p>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="text-center text-sm text-slate-400 py-12">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-slate-400 py-12">
                      No messages yet — say hello.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.senderId === user?.id
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                              mine
                                ? 'bg-emerald-600 text-white rounded-br-sm'
                                : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-bl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                mine ? 'text-emerald-100' : 'text-slate-400'
                              }`}
                            >
                              {formatTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <footer className="border-t border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      placeholder={`Message ${activeConversation.teacher?.name ?? 'teacher'}…`}
                      className="flex-1 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      className="px-5 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? '…' : 'Send'}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
