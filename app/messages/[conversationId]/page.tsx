'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import io, { Socket } from 'socket.io-client'

let socket: Socket | null = null

export default function ConversationPage() {
  const { conversationId } = useParams()
  const router = useRouter()
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const user = getUser()

  useEffect(() => {
    if (conversationId) {
      loadConversation()
      loadMessages()
      initSocket()
    }
    return () => {
      if (socket) {
        socket.emit('leave_conversation', conversationId)
        socket.disconnect()
        socket = null
      }
    }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initSocket = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
    })

    socket.on('connect', () => {
      socket?.emit('join_conversation', conversationId)
    })

    socket.on('new_message', (message: any) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => [...prev, message])
        socket?.emit('mark_read', conversationId)
      }
    })

    socket.on('typing', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 3000)
      }
    })
  }

  const loadConversation = async () => {
    try {
      const res = await api.get('/api/messages/conversations')
      const conv = res.data.find((c: any) => c.id === conversationId)
      if (conv) setConversation(conv)
    } catch (err) {
      console.error(err)
    }
  }

  const loadMessages = async () => {
    try {
      const res = await api.get(`/api/messages/conversations/${conversationId}/messages`)
      setMessages(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { conversationId, userId: user?.id })
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const res = await api.post(`/api/messages/conversations/${conversationId}/messages`, {
        body: newMessage.trim(),
      })
      setMessages((prev) => [...prev, res.data])
      setNewMessage('')
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const getConversationTitle = () => {
    if (!conversation) return 'Conversation'
    if (!user) return 'Conversation'
    if (user.role === 'teacher') {
      return `${conversation.parent?.name} — ${conversation.student?.name}`
    }
    if (user.role === 'parent') {
      return `${conversation.teacher?.name} — re: ${conversation.student?.name}`
    }
    return conversation.teacher?.name || 'Conversation'
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: any[] }[] = []
  messages.forEach((msg) => {
    const dateStr = formatDate(msg.createdAt)
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.date === dateStr) {
      last.messages.push(msg)
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] })
    }
  })

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <button
          onClick={() => router.push('/messages')}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Back to conversations"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white truncate">{getConversationTitle()}</p>
          {isTyping && (
            <p className="text-xs text-brand-500 animate-pulse">typing...</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400 whitespace-nowrap">{group.date}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-3">
                {group.messages.map((msg) => {
                  const isMine = msg.senderId === user?.id
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? 'bg-brand-500 text-white rounded-br-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-sm border border-slate-100 dark:border-slate-700'
                        }`}
                      >
                        {!isMine && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {msg.sender?.name}
                          </p>
                        )}
                        {msg.body && <p className="text-sm leading-relaxed">{msg.body}</p>}
                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 mt-1.5 text-xs underline ${
                              isMine ? 'text-blue-100' : 'text-brand-500'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            Attachment
                          </a>
                        )}
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="p-2.5 bg-brand-500 text-white rounded-full hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
