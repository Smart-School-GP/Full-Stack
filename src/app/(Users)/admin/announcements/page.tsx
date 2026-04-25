'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    audience: 'all',
    pinned: false,
    expires_at: '',
    category: 'general',
  })
  const router = useRouter()

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = () => {
    api.get('/api/announcements')
      .then((res) => setAnnouncements(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/api/announcements/${editing.id}`, formData)
      } else {
        await api.post('/api/announcements', formData)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({ title: '', body: '', audience: 'all', pinned: false, expires_at: '', category: 'general' })
      loadAnnouncements()
    } catch (err) {
      console.error(err)
      alert('Failed to save announcement')
    }
  }

  const handleEdit = (announcement: any) => {
    setEditing(announcement)
    setFormData({
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      pinned: announcement.pinned,
      expires_at: announcement.expiresAt ? announcement.expiresAt.split('T')[0] : '',
      category: announcement.category || 'general',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      await api.delete(`/api/announcements/${id}`)
      loadAnnouncements()
    } catch (err) {
      console.error(err)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
            <p className="text-slate-500 mt-1">Manage school announcements</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditing(null); setFormData({ title: '', body: '', audience: 'all', pinned: false, expires_at: '', category: 'general' }) }}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            + New Announcement
          </button>
        </div>

        {showForm && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
                  <select
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="all">All</option>
                    <option value="teachers">Teachers</option>
                    <option value="parents">Parents</option>
                    <option value="students">Students</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expires (optional)</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="general">General</option>
                    <option value="curriculum">Curriculum</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="pinned" className="text-sm text-slate-700">Pin this announcement</label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                >
                  {editing ? 'Update' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null) }}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {announcement.pinned && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                          Pinned
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                        {announcement.audience}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        announcement.category === 'curriculum' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {announcement.category || 'general'}
                      </span>
                      <h3 className="font-semibold text-slate-800">{announcement.title}</h3>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{announcement.body}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {formatDate(announcement.createdAt)} • by {announcement.creator?.name}
                      {announcement.expiresAt && ` • Expires: ${formatDate(announcement.expiresAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="text-slate-400 hover:text-brand-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
