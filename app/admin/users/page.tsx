'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import ExportButtons from '@/components/ui/ExportButtons'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import api from '@/lib/api'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const res = await api.get('/api/admin/users')
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/admin/users', form)
      setShowModal(false)
      setForm({ name: '', email: '', password: '', role: 'student' })
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await api.delete(`/api/admin/users/${id}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user')
    }
  }

  const filtered = users.filter((u) => {
    const matchRole = filter === 'all' || u.role === filter
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      parent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      student: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[role] || 'bg-slate-100 text-slate-700'}`}>
        {role}
      </span>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (u: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-semibold">
            {u.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 md:hidden">{u.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      className: 'hidden md:table-cell',
      render: (u: any) => <span className="text-slate-500 dark:text-slate-400">{u.email}</span>
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: any) => roleBadge(u.role)
    },
    {
      key: 'createdAt',
      header: 'Joined',
      className: 'hidden md:table-cell',
      render: (u: any) => <span className="text-slate-400 dark:text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</span>
    },
    {
      key: 'actions',
      header: '',
      render: (u: any) => (
        <div className="flex justify-end">
          <button
            onClick={() => handleDelete(u.id)}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors text-xs font-medium"
          >
            Delete
          </button>
        </div>
      )
    }
  ]

  const exportHeaders = ['Name', 'Email', 'Role', 'Joined Date']
  const exportRows = filtered.map(u => [u.name, u.email, u.role, new Date(u.createdAt).toLocaleDateString()])

  const headerAction = (
    <div className="flex items-center gap-3">
        <ExportButtons 
            title="User List Export"
            headers={exportHeaders}
            rows={exportRows}
            filename={`users_export_${new Date().toISOString().split('T')[0]}`}
        />
        <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Add User
        </button>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <PageHeader
          title="Users"
          subtitle={`${users.length} total registered users`}
          action={headerAction}
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 max-w-sm">
            <input
                type="text"
                placeholder="Search by name or email..."
                className="input w-full dark:bg-slate-800 dark:border-slate-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'admin', 'teacher', 'parent', 'student'].map((r) => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === r
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Table/List */}
        <div className="card p-0 overflow-hidden bg-transparent border-none shadow-none md:bg-white md:dark:bg-slate-800 md:border md:shadow-sm">
          {loading ? (
            <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveTable
                columns={columns}
                data={filtered}
                keyField="id"
                emptyMessage="No users found matching your criteria"
            />
          )}
        </div>

        {/* Create User Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New User">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">
                {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input dark:bg-slate-800 dark:border-slate-700" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input dark:bg-slate-800 dark:border-slate-700" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input dark:bg-slate-800 dark:border-slate-700" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">System Role</label>
              <select className="input dark:bg-slate-800 dark:border-slate-700" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Creating Account...' : 'Create User Account'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
