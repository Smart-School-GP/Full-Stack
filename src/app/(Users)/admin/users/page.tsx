'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import ExportButtons from '@/components/ui/ExportButtons'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import api from '@/lib/api'

type Role = 'student' | 'teacher' | 'parent' | 'admin'

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

interface Room {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
  teacherId: string | null
}

// One subject row in the teacher form: either pick an existing subject in a
// room (subject_id), or create a new one (name) — never both.
interface TeacherSubjectRow {
  roomId: string
  subjectId: string
  newName: string
}

const ROLE_OPTIONS: Role[] = ['student', 'teacher', 'parent', 'admin']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Base form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('student')

  // Lookup data — loaded lazily when the modal opens
  const [rooms, setRooms] = useState<Room[]>([])
  const [subjectsByRoom, setSubjectsByRoom] = useState<Record<string, Subject[]>>({})
  const [lookupsLoading, setLookupsLoading] = useState(false)

  // Teacher-specific selection
  const [teacherRoomIds, setTeacherRoomIds] = useState<string[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectRow[]>([])

  // Student-specific selection
  const [studentRoomIds, setStudentRoomIds] = useState<string[]>([])
  const [studentParentIds, setStudentParentIds] = useState<string[]>([])

  // Parent-specific selection
  const [parentStudentIds, setParentStudentIds] = useState<string[]>([])

  const [filter, setFilter] = useState<'all' | Role>('all')
  const [search, setSearch] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)

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

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('student')
    setTeacherRoomIds([])
    setTeacherSubjects([])
    setStudentRoomIds([])
    setStudentParentIds([])
    setParentStudentIds([])
    setError('')
  }

  const openCreateModal = async () => {
    resetForm()
    setShowModal(true)
    if (rooms.length === 0) {
      setLookupsLoading(true)
      try {
        const res = await api.get('/api/admin/rooms')
        const list: Room[] = (res.data || []).map((r: any) => ({ id: r.id, name: r.name }))
        setRooms(list)
      } catch (err) {
        console.error('Failed to load rooms', err)
      } finally {
        setLookupsLoading(false)
      }
    }
  }

  // Lazy-fetch subjects for a room when a teacher form needs them.
  const ensureSubjectsForRoom = async (roomId: string) => {
    if (subjectsByRoom[roomId]) return
    try {
      const res = await api.get(`/api/admin/rooms/${roomId}/subjects`)
      const list: Subject[] = (res.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        teacherId: s.teacherId ?? null,
      }))
      setSubjectsByRoom((prev) => ({ ...prev, [roomId]: list }))
    } catch (err) {
      console.error('Failed to load subjects for room', roomId, err)
    }
  }

  const toggleTeacherRoom = async (roomId: string) => {
    setTeacherRoomIds((prev) => {
      if (prev.includes(roomId)) {
        // Drop any subject rows tied to this room when the room is unchecked.
        setTeacherSubjects((rows) => rows.filter((r) => r.roomId !== roomId))
        return prev.filter((id) => id !== roomId)
      }
      return [...prev, roomId]
    })
    await ensureSubjectsForRoom(roomId)
  }

  const addTeacherSubjectRow = () => {
    setTeacherSubjects((prev) => [...prev, { roomId: '', subjectId: '', newName: '' }])
  }

  const updateTeacherSubjectRow = (index: number, patch: Partial<TeacherSubjectRow>) => {
    setTeacherSubjects((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    if (patch.roomId) ensureSubjectsForRoom(patch.roomId)
  }

  const removeTeacherSubjectRow = (index: number) => {
    setTeacherSubjects((prev) => prev.filter((_, i) => i !== index))
  }

  const parents = useMemo(() => users.filter((u) => u.role === 'parent'), [users])
  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users])

  const buildAssignments = (): Record<string, unknown> | null => {
    if (role === 'teacher') {
      const subjectsPayload: Array<{ room_id: string; subject_id?: string; name?: string }> = []
      for (const row of teacherSubjects) {
        if (!row.roomId) {
          setError('Each subject row needs a room.')
          return null
        }
        if (row.subjectId && row.newName) {
          setError('For each subject, choose existing or new — not both.')
          return null
        }
        if (!row.subjectId && !row.newName.trim()) {
          setError('Each subject row needs an existing subject or a new name.')
          return null
        }
        if (row.subjectId) {
          subjectsPayload.push({ room_id: row.roomId, subject_id: row.subjectId })
        } else {
          subjectsPayload.push({ room_id: row.roomId, name: row.newName.trim() })
        }
      }
      return { room_ids: teacherRoomIds, subjects: subjectsPayload }
    }
    if (role === 'student') {
      return { room_ids: studentRoomIds, parent_ids: studentParentIds }
    }
    if (role === 'parent') {
      return { student_ids: parentStudentIds }
    }
    return null
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const assignments = buildAssignments()
    if (role !== 'admin' && assignments === null && error) return

    setSaving(true)
    try {
      const payload: Record<string, unknown> = { name, email, password, role }
      if (assignments) payload.assignments = assignments
      await api.post('/api/admin/users', payload)
      setShowModal(false)
      resetForm()
      load()
    } catch (err: any) {
      const apiErr = err.response?.data?.error
      const detail = apiErr?.details?.[0]?.message
      setError(detail || apiErr?.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    try {
      await api.delete(`/api/admin/users/${userToDelete.id}`)
      setShowDeleteModal(false)
      setUserToDelete(null)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete user')
    }
  }

  const filtered = users.filter((u) => {
    const matchRole = filter === 'all' || u.role === filter
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const roleBadge = (r: string) => {
    const map: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      parent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      student: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[r] || 'bg-slate-100 text-slate-700'}`}>
        {r}
      </span>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (u: UserRow) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-semibold">
            {u.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 md:hidden">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      className: 'hidden md:table-cell',
      render: (u: UserRow) => <span className="text-slate-500 dark:text-slate-400">{u.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: UserRow) => roleBadge(u.role),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      className: 'hidden md:table-cell',
      render: (u: UserRow) => <span className="text-slate-400 dark:text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (u: UserRow) => (
        <div className="flex justify-end">
          <button
            onClick={() => { setUserToDelete(u); setShowDeleteModal(true) }}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete user"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  const exportHeaders = ['Name', 'Email', 'Role', 'Joined Date']
  const exportRows = filtered.map((u) => [u.name, u.email, u.role, new Date(u.createdAt).toLocaleDateString()])

  const headerAction = (
    <div className="flex items-center gap-3">
      <ExportButtons
        title="User List Export"
        headers={exportHeaders}
        rows={exportRows}
        filename={`users_export_${new Date().toISOString().split('T')[0]}`}
      />
      <button className="btn-primary" onClick={openCreateModal}>
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
            {(['all', ...ROLE_OPTIONS] as const).map((r) => (
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

        {/* Table */}
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

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setUserToDelete(null) }} title="Delete User">
          <div className="mb-6">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-center text-slate-700 dark:text-slate-200 font-medium">
              Are you sure you want to delete <span className="font-bold">{userToDelete?.name}</span>?
            </p>
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-1">This action cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => { setShowDeleteModal(false); setUserToDelete(null) }}>Cancel</button>
            <button className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors" onClick={handleDelete}>
              Delete User
            </button>
          </div>
        </Modal>

        {/* Create User Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); resetForm() }}
          title="Add New User"
          size="lg"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input dark:bg-slate-800 dark:border-slate-700"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input dark:bg-slate-800 dark:border-slate-700"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input dark:bg-slate-800 dark:border-slate-700"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">System Role</label>
              <select
                className="input dark:bg-slate-800 dark:border-slate-700"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {role === 'teacher' && (
              <TeacherFields
                rooms={rooms}
                lookupsLoading={lookupsLoading}
                roomIds={teacherRoomIds}
                onToggleRoom={toggleTeacherRoom}
                subjectRows={teacherSubjects}
                subjectsByRoom={subjectsByRoom}
                onAddRow={addTeacherSubjectRow}
                onUpdateRow={updateTeacherSubjectRow}
                onRemoveRow={removeTeacherSubjectRow}
              />
            )}

            {role === 'student' && (
              <StudentFields
                rooms={rooms}
                parents={parents}
                lookupsLoading={lookupsLoading}
                roomIds={studentRoomIds}
                parentIds={studentParentIds}
                onToggleRoom={(id) =>
                  setStudentRoomIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
                }
                onToggleParent={(id) =>
                  setStudentParentIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
                }
              />
            )}

            {role === 'parent' && (
              <ParentFields
                students={students}
                studentIds={parentStudentIds}
                onToggleStudent={(id) =>
                  setParentStudentIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
                }
              />
            )}

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
              <button type="button" className="btn-secondary flex-1" onClick={() => { setShowModal(false); resetForm() }}>
                Cancel
              </button>
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

// ── Role-specific field groups ──────────────────────────────────────────────

interface CheckboxListProps {
  items: { id: string; label: string; sublabel?: string }[]
  selected: string[]
  onToggle: (id: string) => void
  emptyMessage: string
}

function CheckboxList({ items, selected, onToggle, emptyMessage }: CheckboxListProps) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 italic px-2 py-3">
        {emptyMessage}
      </p>
    )
  }
  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
      {items.map((item) => {
        const isOn = selected.includes(item.id)
        return (
          <label
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => onToggle(item.id)}
              className="rounded text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {item.label}
              {item.sublabel && (
                <span className="text-slate-400 dark:text-slate-500 ml-2 text-xs">{item.sublabel}</span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}

interface TeacherFieldsProps {
  rooms: Room[]
  lookupsLoading: boolean
  roomIds: string[]
  onToggleRoom: (id: string) => void
  subjectRows: TeacherSubjectRow[]
  subjectsByRoom: Record<string, Subject[]>
  onAddRow: () => void
  onUpdateRow: (index: number, patch: Partial<TeacherSubjectRow>) => void
  onRemoveRow: (index: number) => void
}

function TeacherFields({
  rooms,
  lookupsLoading,
  roomIds,
  onToggleRoom,
  subjectRows,
  subjectsByRoom,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: TeacherFieldsProps) {
  const selectedRooms = rooms.filter((r) => roomIds.includes(r.id))

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
      <div>
        <label className="label">Rooms this teacher will teach</label>
        {lookupsLoading ? (
          <p className="text-xs text-slate-400 italic px-2 py-3">Loading rooms…</p>
        ) : (
          <CheckboxList
            items={rooms.map((r) => ({ id: r.id, label: r.name }))}
            selected={roomIds}
            onToggle={onToggleRoom}
            emptyMessage="No rooms exist yet — create one in the Rooms section first."
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label !mb-0">Subjects taught</label>
          <button
            type="button"
            onClick={onAddRow}
            disabled={selectedRooms.length === 0}
            className="text-xs font-semibold text-brand-600 disabled:text-slate-300 hover:text-brand-700"
          >
            + Add subject
          </button>
        </div>

        {selectedRooms.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Pick at least one room above to assign subjects.
          </p>
        ) : subjectRows.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            No subjects added — optional.
          </p>
        ) : (
          <div className="space-y-2">
            {subjectRows.map((row, idx) => {
              const subjectsForRow = row.roomId ? subjectsByRoom[row.roomId] || [] : []
              return (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                >
                  <select
                    className="input !py-1.5 text-sm flex-1"
                    value={row.roomId}
                    onChange={(e) => onUpdateRow(idx, { roomId: e.target.value, subjectId: '', newName: '' })}
                  >
                    <option value="">— Room —</option>
                    {selectedRooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>

                  <select
                    className="input !py-1.5 text-sm flex-1"
                    value={row.subjectId}
                    onChange={(e) => onUpdateRow(idx, { subjectId: e.target.value, newName: '' })}
                    disabled={!row.roomId}
                  >
                    <option value="">— Existing subject —</option>
                    {subjectsForRow.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.teacherId ? ' (currently assigned)' : ''}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input !py-1.5 text-sm flex-1"
                    placeholder="…or new subject name"
                    value={row.newName}
                    onChange={(e) => onUpdateRow(idx, { newName: e.target.value, subjectId: '' })}
                    disabled={!row.roomId}
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveRow(idx)}
                    className="text-red-400 hover:text-red-600 px-2"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface StudentFieldsProps {
  rooms: Room[]
  parents: UserRow[]
  lookupsLoading: boolean
  roomIds: string[]
  parentIds: string[]
  onToggleRoom: (id: string) => void
  onToggleParent: (id: string) => void
}

function StudentFields({
  rooms,
  parents,
  lookupsLoading,
  roomIds,
  parentIds,
  onToggleRoom,
  onToggleParent,
}: StudentFieldsProps) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
      <div>
        <label className="label">Enroll in rooms</label>
        {lookupsLoading ? (
          <p className="text-xs text-slate-400 italic px-2 py-3">Loading rooms…</p>
        ) : (
          <CheckboxList
            items={rooms.map((r) => ({ id: r.id, label: r.name }))}
            selected={roomIds}
            onToggle={onToggleRoom}
            emptyMessage="No rooms exist yet — create one in the Rooms section first."
          />
        )}
      </div>

      <div>
        <label className="label">Link to parent(s)</label>
        <CheckboxList
          items={parents.map((p) => ({ id: p.id, label: p.name, sublabel: p.email }))}
          selected={parentIds}
          onToggle={onToggleParent}
          emptyMessage="No parents in the system — you can link them later."
        />
      </div>
    </div>
  )
}

interface ParentFieldsProps {
  students: UserRow[]
  studentIds: string[]
  onToggleStudent: (id: string) => void
}

function ParentFields({ students, studentIds, onToggleStudent }: ParentFieldsProps) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
      <div>
        <label className="label">Children (students)</label>
        <CheckboxList
          items={students.map((s) => ({ id: s.id, label: s.name, sublabel: s.email }))}
          selected={studentIds}
          onToggle={onToggleStudent}
          emptyMessage="No students in the system — you can link them later."
        />
      </div>
    </div>
  )
}
