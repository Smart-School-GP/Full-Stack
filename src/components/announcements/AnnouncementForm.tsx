'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import Modal from '@/components/ui/Modal'

type Role = 'admin' | 'teacher' | 'student' | 'parent' | 'owner'

type Audience = 'all' | 'teachers' | 'parents' | 'students' | 'subject' | 'room' | 'custom'

interface SubjectTarget { id: string; name: string; room?: { id: string; name: string } | null }
interface RoomTarget { id: string; name: string }
interface UserTarget { id: string; name: string; role: string }
interface Targets { subjects: SubjectTarget[]; rooms: RoomTarget[]; users: UserTarget[] }

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  role: Role
}

const ROLE_AUDIENCES: Audience[] = ['all', 'teachers', 'parents', 'students', 'subject', 'room', 'custom']
const TEACHER_AUDIENCES: Audience[] = ['subject', 'room', 'custom']

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'Everyone',
  teachers: 'All teachers',
  parents: 'All parents',
  students: 'All students',
  subject: 'A specific subject',
  room: 'A specific class',
  custom: 'Specific people',
}

export default function AnnouncementForm({ isOpen, onClose, onCreated, role }: Props) {
  const audiences = role === 'admin' ? ROLE_AUDIENCES : TEACHER_AUDIENCES

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>(audiences[0])
  const [subjectId, setSubjectId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  const [pinned, setPinned] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [category, setCategory] = useState('general')
  const [userFilter, setUserFilter] = useState('')

  const [targets, setTargets] = useState<Targets | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    api
      .get<{ data: Targets }>('/api/announcements/targets')
      .then((res: any) => {
        const data = res?.data ?? res
        setTargets(data)
      })
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load targets'))
      .finally(() => setLoading(false))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setBody('')
      setAudience(audiences[0])
      setSubjectId('')
      setRoomId('')
      setRecipientIds([])
      setPinned(false)
      setExpiresAt('')
      setCategory('general')
      setUserFilter('')
      setError(null)
    }
  }, [isOpen, audiences])

  const filteredUsers = useMemo(() => {
    if (!targets) return []
    const q = userFilter.trim().toLowerCase()
    if (!q) return targets.users
    return targets.users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    )
  }, [targets, userFilter])

  const toggleRecipient = (id: string) => {
    setRecipientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required'
    if (!body.trim()) return 'Body is required'
    if (audience === 'subject' && !subjectId) return 'Pick a subject'
    if (audience === 'room' && !roomId) return 'Pick a class'
    if (audience === 'custom' && recipientIds.length === 0) return 'Pick at least one person'
    return null
  }

  const submit = async () => {
    const v = validate()
    if (v) { setError(v); return }
    setError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        audience,
        pinned,
        category,
      }
      if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString()
      if (audience === 'subject') payload.subject_id = subjectId
      if (audience === 'room') payload.room_id = roomId
      if (audience === 'custom') payload.recipient_ids = recipientIds

      await api.post('/api/announcements', payload)
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to publish')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New announcement" size="lg">
      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading targets...</div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Field trip on Friday"
              maxLength={200}
            />
          </div>

          <div>
            <label className="label">Body</label>
            <textarea
              className="input min-h-[120px] resize-y"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Details..."
              maxLength={5000}
            />
          </div>

          <div>
            <label className="label">Send to</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {audiences.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAudience(a)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    audience === a
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200'
                      : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {AUDIENCE_LABEL[a]}
                </button>
              ))}
            </div>
          </div>

          {audience === 'subject' && (
            <div>
              <label className="label">Subject</label>
              <select
                className="input"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Select a subject…</option>
                {targets?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.room ? ` — ${s.room.name}` : ''}
                  </option>
                ))}
              </select>
              {targets && targets.subjects.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">No subjects available.</p>
              )}
            </div>
          )}

          {audience === 'room' && (
            <div>
              <label className="label">Class</label>
              <select
                className="input"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                <option value="">Select a class…</option>
                {targets?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {targets && targets.rooms.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">No classes available.</p>
              )}
            </div>
          )}

          {audience === 'custom' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Recipients</label>
                <span className="text-xs text-slate-400">{recipientIds.length} selected</span>
              </div>
              <input
                className="input mb-2"
                placeholder="Search by name or role…"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
              <div className="border border-slate-200 dark:border-slate-600 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-sm text-slate-400 text-center">No matches</div>
                ) : (
                  filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="accent-brand-500"
                        checked={recipientIds.includes(u.id)}
                        onChange={() => toggleRecipient(u.id)}
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{u.name}</span>
                      <span className={`badge-${u.role}`}>{u.role}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="event">Event</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="label">Expires (optional)</label>
              <input
                type="datetime-local"
                className="input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="accent-brand-500"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Pin to top
          </label>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
