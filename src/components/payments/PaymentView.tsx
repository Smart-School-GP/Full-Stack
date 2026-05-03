'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'

interface Payment {
  id: string
  parentId: string
  amount: number
  currency: string
  status: string
  description: string | null
  dueDate: string | null
  paidAt: string | null
  createdAt: string
  parent?: {
    name: string
    email: string
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function PaymentView({ isAdmin }: { isAdmin: boolean }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [parents, setParents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [selectedParentId, setSelectedParentId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  const load = async () => {
    try {
      const endpoint = isAdmin ? '/api/payments' : '/api/payments/my'
      const res = await api.get(endpoint)
      setPayments(res.data?.data || res.data || [])
      
      if (isAdmin) {
        const usersRes = await api.get('/api/admin/users')
        const users = usersRes.data?.data || usersRes.data || []
        setParents(users.filter((u: User) => u.role === 'parent'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/payments', {
        parentId: selectedParentId,
        amount,
        description,
        dueDate
      })
      setShowAddModal(false)
      load()
      // Reset form
      setSelectedParentId('')
      setAmount('')
      setDescription('')
      setDueDate('')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/api/payments/${id}`, { status })
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment request?')) return
    try {
      await api.delete(`/api/payments/${id}`)
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const columns = [
    ...(isAdmin ? [
      {
        key: 'parent',
        header: 'Parent',
        render: (p: Payment) => (
          <div>
            <p className="font-bold text-slate-800 dark:text-white">{p.parent?.name}</p>
            <p className="text-[10px] text-slate-400">{p.parent?.email}</p>
          </div>
        )
      }
    ] : []),
    {
      key: 'amount',
      header: 'Amount',
      render: (p: Payment) => <span className="font-mono font-bold">{p.amount} {p.currency}</span>
    },
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-xs truncate text-xs'
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: Payment) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
          p.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {p.status}
        </span>
      )
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (p: Payment) => (
        <div className="text-[10px] text-slate-400">
          <p>Created: {new Date(p.createdAt).toLocaleDateString()}</p>
          {p.dueDate && <p className="text-amber-500">Due: {new Date(p.dueDate).toLocaleDateString()}</p>}
          {p.paidAt && <p className="text-emerald-500">Paid: {new Date(p.paidAt).toLocaleDateString()}</p>}
        </div>
      )
    },
    ...(isAdmin ? [
      {
        key: 'actions',
        header: 'Actions',
        className: 'text-right',
        render: (p: Payment) => (
          <div className="flex justify-end gap-2">
            {p.status === 'PENDING' && (
              <button 
                onClick={() => handleStatusUpdate(p.id, 'PAID')}
                className="btn-primary !py-1 !px-2 !text-[10px]"
              >
                Mark Paid
              </button>
            )}
            <button 
              onClick={() => handleDelete(p.id)}
              className="text-slate-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        )
      }
    ] : [])
  ]

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
      <div className="flex items-center justify-between mb-8">
        <PageHeader 
          title="School Payments" 
          subtitle={isAdmin ? "Issue and track payment requests for parents." : "View and track your school fee payments."}
        />
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            + Issue Payment
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveTable 
            columns={columns} 
            data={payments} 
            keyField="id" 
            emptyMessage="No payment records found."
          />
        )}
      </div>

      {isAdmin && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Issue New Payment Request">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Parent</label>
              <select 
                className="input dark:bg-slate-800 dark:border-slate-700"
                required
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
              >
                <option value="">— Select Parent —</option>
                {parents.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Amount (USD)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="input dark:bg-slate-800 dark:border-slate-700"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="250.00"
                />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input 
                  type="date"
                  className="input dark:bg-slate-800 dark:border-slate-700"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Description / Purpose</label>
              <textarea 
                className="input dark:bg-slate-800 dark:border-slate-700 h-24"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Tuition Fee - Q3 2026"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Issuing...' : 'Issue Payment'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
