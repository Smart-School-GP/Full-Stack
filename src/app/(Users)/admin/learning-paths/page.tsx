'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/ui/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import ExportButtons from '@/components/ui/ExportButtons'
import api from '@/lib/api'

interface LearningPath {
  id: string
  title: string
  description: string | null
  isPublished: boolean
  orderIndex: number
  createdAt: string
  subject: { id: string; name: string } | null
  curriculumSubject: { id: string; name: string; curriculum: { gradeLevel: number } } | null
  teacher: { id: string; name: string }
  _count: { modules: number }
}

interface Subject {
  id: string
  name: string
  teacherId: string | null
  teacher?: { id: string; name: string } | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface CurriculumSubject {
  id: string
  name: string
  gradeLevel: number
}

const emptyForm = {
  title: '',
  description: '',
  subject_id: '',
  curriculum_subject_id: '',
  teacher_id: '',
  is_published: false,
  order_index: 0,
}

export default function AdminLearningPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState<LearningPath | null>(null)

  // Form state
  const [form, setForm] = useState(emptyForm)

  // Search / filter
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all')

  // ── Data loading ──────────────────────────────────────────────────────────────

  const load = async () => {
    try {
      const [pathsRes, usersRes] = await Promise.all([
        api.get('/api/admin/learning-paths'),
        api.get('/api/admin/users'),
      ])
      const rawPaths: LearningPath[] = pathsRes.data?.data ?? pathsRes.data
      setPaths(rawPaths)

      const rawUsers: User[] = usersRes.data?.data ?? usersRes.data
      setUsers(rawUsers)

      // Derive subjects from paths (avoids needing an extra endpoint)
      const subjectMap = new Map<string, Subject>()
      rawPaths.forEach((p) => {
        if (p.subject) {
          if (!subjectMap.has(p.subject.id)) {
            subjectMap.set(p.subject.id, { id: p.subject.id, name: p.subject.name, teacherId: p.teacher.id })
          }
        }
      })

      // Also fetch all subjects from rooms to allow creating paths for subjects that have no path yet
      try {
        const roomsRes = await api.get('/api/admin/rooms')
        const rooms: any[] = roomsRes.data?.data ?? roomsRes.data
        for (const room of rooms) {
          const subjRes = await api.get(`/api/admin/rooms/${room.id}/subjects`)
          const roomSubjects: any[] = subjRes.data?.data ?? subjRes.data
          roomSubjects.forEach((s: any) => {
            if (!subjectMap.has(s.id)) {
              subjectMap.set(s.id, { id: s.id, name: s.name, teacherId: s.teacherId, teacher: s.teacher })
            }
          })
        }
      } catch { /* ignore if rooms endpoint not available */ }

      // Fetch curriculum subjects
      try {
        const curRes = await api.get('/api/admin/curriculum')
        const curriculums: any[] = curRes.data
        const cSubjs: CurriculumSubject[] = []
        for (const cur of curriculums || []) {
            const detRes = await api.get(`/api/admin/curriculum/${cur.id}`)
            const details = detRes.data
            details.subjects.forEach((s: any) => {
                cSubjs.push({ id: s.id, name: s.name, gradeLevel: cur.gradeLevel })
            })
        }
        setCurriculumSubjects(cSubjs)
      } catch (err) { console.error('Failed to load curriculums', err) }

      setSubjects(Array.from(subjectMap.values()))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm)
    setError('')
    setShowCreate(true)
  }

  const openEdit = (path: LearningPath) => {
    setSelected(path)
    setForm({
      title: path.title,
      description: path.description ?? '',
      subject_id: path.subject?.id || '',
      curriculum_subject_id: path.curriculumSubject?.id || '',
      teacher_id: path.teacher.id,
      is_published: path.isPublished,
      order_index: path.orderIndex,
    })
    setError('')
    setShowEdit(true)
  }

  const openDelete = (path: LearningPath) => {
    setSelected(path)
    setError('')
    setShowDelete(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/admin/learning-paths', {
        ...form,
        order_index: Number(form.order_index),
      })
      setShowCreate(false)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || 'Failed to create path')
    } finally { setSaving(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setError('')
    setSaving(true)
    try {
      await api.put(`/api/admin/learning-paths/${selected.id}`, {
        ...form,
        order_index: Number(form.order_index),
      })
      setShowEdit(false)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || 'Failed to update path')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setError('')
    setSaving(true)
    try {
      await api.delete(`/api/admin/learning-paths/${selected.id}`)
      setShowDelete(false)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || 'Failed to delete path')
    } finally { setSaving(false) }
  }

  const togglePublish = async (path: LearningPath) => {
    try {
      await api.put(`/api/admin/learning-paths/${path.id}`, { is_published: !path.isPublished })
      await load()
    } catch { /* silent */ }
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const teachers = users.filter((u) => u.role === 'teacher')

  const filtered = paths.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.subject?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.curriculumSubject?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      p.teacher.name.toLowerCase().includes(search.toLowerCase())
    const matchSubject = !filterSubject || p.subject?.id === filterSubject || p.curriculumSubject?.id === filterSubject
    const matchPub = filterPublished === 'all' ||
      (filterPublished === 'published' && p.isPublished) ||
      (filterPublished === 'draft' && !p.isPublished)
    return matchSearch && matchSubject && matchPub
  })

  const exportHeaders = ['Title', 'Subject', 'Teacher', 'Modules', 'Status', 'Order', 'Created']
  const exportRows = filtered.map((p) => [
    p.title,
    p.curriculumSubject ? `${p.curriculumSubject.name} (Grade ${p.curriculumSubject.curriculum.gradeLevel})` : (p.subject?.name || 'N/A'),
    p.teacher.name,
    p._count.modules,
    p.isPublished ? 'Published' : 'Draft',
    p.orderIndex,
    new Date(p.createdAt).toLocaleDateString(),
  ])

  const publishedCount = paths.filter((p) => p.isPublished).length
  const draftCount = paths.length - publishedCount

  // ── Render ────────────────────────────────────────────────────────────────────

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <ExportButtons
        title="Learning Paths Export"
        headers={exportHeaders}
        rows={exportRows}
        filename={`learning_paths_${new Date().toISOString().split('T')[0]}`}
      />
      <button
        id="create-learning-path-btn"
        className="btn-primary shadow-lg shadow-brand-500/20"
        onClick={openCreate}
      >
        + New Learning Path
      </button>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <PageHeader
          title="Learning Paths"
          subtitle={`${paths.length} paths total — ${publishedCount} published, ${draftCount} draft`}
          action={actions}
        />

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Paths', value: paths.length, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/20' },
            { label: 'Published', value: publishedCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Drafts', value: draftCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Subjects Covered', value: new Set(paths.map((p) => p.subject?.id || p.curriculumSubject?.id).filter(Boolean)).size, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex flex-col gap-1 ${stat.bg} shadow-sm`}>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-sm">
          <input
            id="lp-search"
            type="text"
            className="input flex-1"
            placeholder="Search by title, subject or teacher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            id="lp-filter-subject"
            className="input sm:w-52"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            <optgroup label="Curriculum Subjects">
              {curriculumSubjects.map((cs) => (
                <option key={cs.id} value={cs.id}>{cs.name} (G{cs.gradeLevel})</option>
              ))}
            </optgroup>
            <optgroup label="Room Subjects">
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          </select>
          <select
            id="lp-filter-status"
            className="input sm:w-44"
            value={filterPublished}
            onChange={(e) => setFilterPublished(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-16 text-center shadow-sm">
            <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6a2 2 0 00-2-2H5a2 2 0 00-2 2v13a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No learning paths found.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Create your first path to get started.</p>
            <button className="btn-primary mt-4" onClick={openCreate}>+ New Learning Path</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    {['Title', 'Subject', 'Teacher', 'Modules', 'Order', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {filtered.map((path) => (
                    <tr key={path.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors group">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800 dark:text-white">{path.title}</p>
                        {path.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">{path.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {path.curriculumSubject ? (
                          <span className="inline-flex flex-col">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                              {path.curriculumSubject.name}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-1 font-bold ml-1 uppercase">Grade {path.curriculumSubject.curriculum.gradeLevel} Core</span>
                          </span>
                        ) : (
                          <span className="inline-flex flex-col">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                              {path.subject?.name || 'N/A'}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-1 font-bold ml-1 uppercase text-center italic">Room Specific</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{path.teacher.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                          {path._count.modules}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-center">{path.orderIndex}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => togglePublish(path)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            path.isPublished
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                          }`}
                          title={path.isPublished ? 'Click to unpublish' : 'Click to publish'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${path.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {path.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            id={`edit-path-${path.id}`}
                            onClick={() => openEdit(path)}
                            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20"
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-path-${path.id}`}
                            onClick={() => openDelete(path)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 dark:text-slate-500">
              Showing {filtered.length} of {paths.length} paths
            </div>
          </div>
        )}

        {/* ── Create Modal ── */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Learning Path">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}
          <PathForm
            form={form}
            setForm={setForm}
            subjects={subjects}
            curriculumSubjects={curriculumSubjects}
            teachers={teachers}
            saving={saving}
            submitLabel="Create Path"
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>

        {/* ── Edit Modal ── */}
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit: ${selected?.title}`}>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}
          <PathForm
            form={form}
            setForm={setForm}
            subjects={subjects}
            curriculumSubjects={curriculumSubjects}
            teachers={teachers}
            saving={saving}
            submitLabel="Save Changes"
            onSubmit={handleEdit}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>

        {/* ── Delete Confirm Modal ── */}
        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Learning Path">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Are you sure you want to delete <strong>&ldquo;{selected?.title}&rdquo;</strong>?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                This will permanently delete the path and all its modules &amp; items. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setShowDelete(false)} disabled={saving}>Cancel</button>
              <button
                id="confirm-delete-path"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deleting…' : 'Delete Path'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

// ── Shared Form Component ─────────────────────────────────────────────────────

interface PathFormProps {
  form: typeof emptyForm
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>
  subjects: Subject[]
  curriculumSubjects: CurriculumSubject[]
  teachers: User[]
  saving: boolean
  submitLabel: string
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

function PathForm({ form, setForm, subjects, curriculumSubjects, teachers, saving, submitLabel, onSubmit, onCancel }: PathFormProps) {
  const update = (key: keyof typeof emptyForm, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Title <span className="text-red-500">*</span></label>
        <input
          className="input dark:bg-slate-800 dark:border-slate-700"
          required
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="e.g. Introduction to Algebra"
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input dark:bg-slate-800 dark:border-slate-700 resize-none"
          rows={3}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Optional description for this learning path…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Subject <span className="text-red-500">*</span></label>
          <select
            className="input dark:bg-slate-800 dark:border-slate-700"
            required
            value={form.curriculum_subject_id || form.subject_id}
            onChange={(e) => {
              const val = e.target.value
              const isCurriculum = curriculumSubjects.some((s) => s.id === val)
              if (isCurriculum) {
                update('curriculum_subject_id', val)
                update('subject_id', '')
              } else {
                update('subject_id', val)
                update('curriculum_subject_id', '')
              }
            }}
          >
            <option value="">— Select Subject —</option>
            {curriculumSubjects.length > 0 && (
              <optgroup label="Grade-Level Core (Curriculum)">
                {curriculumSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Grade {s.gradeLevel})</option>
                ))}
              </optgroup>
            )}
            {subjects.length > 0 && (
              <optgroup label="Room Specific">
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="label">Assigned Teacher <span className="text-red-500">*</span></label>
          <select
            className="input dark:bg-slate-800 dark:border-slate-700"
            required
            value={form.teacher_id}
            onChange={(e) => update('teacher_id', e.target.value)}
          >
            <option value="">— Select teacher —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Order Index</label>
          <input
            type="number"
            min={0}
            className="input dark:bg-slate-800 dark:border-slate-700"
            value={form.order_index}
            onChange={(e) => update('order_index', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col justify-end pb-0.5">
          <label className="label">Published</label>
          <button
            type="button"
            onClick={() => update('is_published', !form.is_published)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              form.is_published ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            aria-pressed={form.is_published}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.is_published ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <p className="text-[11px] text-slate-400 mt-1">
            {form.is_published ? 'Visible to students' : 'Hidden — draft mode'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
