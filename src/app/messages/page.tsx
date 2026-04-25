'use client'

import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import io, { Socket } from 'socket.io-client'

let socket: Socket | null = null

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
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
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initSocket = () => {
    const token = localStorage.getItem('token')
    if (!token) return

    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
    })

    socket.on('new_message', (message: any) => {
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages((prev) => [...prev, message])
      }
      loadConversations()
    })

    socket.on('message_notification', (data: any) => {
      loadConversations()
    })
  }

  const loadConversations = () => {
    api.get('/api/messages/conversations')
      .then((res) => setConversations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await api.get(`/api/messages/conversations/${conversationId}/messages`)
      setMessages(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)
    try {
      await api.post(`/api/messages/conversations/${selectedConversation.id}/messages`, {
        body: newMessage,
      })
      setNewMessage('')
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const getOtherParty = (conv: any) => {
    if (user?.role === 'teacher') {
      return { name: conv.parent?.name, role: 'Parent' }
    }
    return { name: conv.teacher?.name, role: 'Teacher' }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Conversations List */}
      <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${
        selectedConversation ? 'hidden md:block' : ''
      }`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Messages</h1>
        </div>

        {loading ? (
          <div className="p-4 text-slate-400 dark:text-slate-500">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-slate-400 dark:text-slate-500 text-center">No conversations</div>
        ) : (
          <div className="overflow-y-auto">
            {conversations.map((conv) => {
              const other = getOtherParty(conv)
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                    selectedConversation?.id === conv.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{other.name}</p>
                    {conv.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-brand-500 text-white text-xs rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {conv.student?.name}
                  </p>
                  {conv.lastMessage && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 truncate">
                      {conv.lastMessage.body}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : ''}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden text-slate-500 dark:text-slate-400"
                >
                  ←
                </button>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    {getOtherParty(selectedConversation).name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedConversation.student?.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-slate-900/40">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.senderId === user?.id
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <p className="text-sm">{msg.body}</p>
                    {msg.attachmentUrl && (
                      <a
                        href={msg.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs mt-1 block underline ${
                          msg.senderId === user?.id ? 'text-brand-100' : 'text-brand-600 dark:text-brand-400'
                        }`}
                      >
                        View attachment
                      </a>
                    )}
                    <p className={`text-xs mt-1 ${
                      msg.senderId === user?.id ? 'text-brand-200' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  )
}
