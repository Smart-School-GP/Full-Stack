import { useUserStore } from '@/lib/store/userStore'

export default function MarkAttendancePage() {
  const params = useParams()
  const classId = params.classId as string
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [className, setClassName] = useState('')
  const { user } = useUserStore()

  const { isOnline, saveOfflineAttendance } = useOfflineSync()

  useEffect(() => {
    loadStudents()
  }, [classId])

  const loadStudents = async () => {
    try {
      const res = await api.get(`/api/attendance/today/${classId}`)
      setStudents(res.data)
      
      const classRes = await api.get(`/api/teacher/classes`)
      const cls = classRes.data.find((c: any) => c.id === classId)
      if (cls) setClassName(cls.name)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student.id === studentId ? { ...s, status } : s
      )
    )
  }

  const handleNoteChange = (studentId: string, note: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student.id === studentId ? { ...s, note } : s
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const records = students.map((s) => ({
      student_id: s.student.id,
      status: s.status,
      note: s.note || '',
    }))

    if (!isOnline) {
      try {
        if (!user) throw new Error('User not found')
        for (const record of records) {
          await saveOfflineAttendance({
            studentId: record.student_id,
            classId: classId,
            date: date,
            status: record.status,
            markedBy: user.id,
            schoolId: user.school_id
          })
        }
        alert('Attendance saved locally. It will sync automatically when you are back online.')
        router.push('/teacher/dashboard')
      } catch (err) {
        console.error(err)
        alert('Failed to save offline attendance')
      } finally {
        setSaving(false)
      }
      return
    }

    try {
      await api.post('/api/attendance', {
        class_id: classId,
        date,
        records,
      })

      alert('Attendance saved successfully!')
      router.push('/teacher/dashboard')
    } catch (err) {
      console.error(err)
      alert('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ]

  const columns = [
    {
      key: 'name',
      header: 'Student',
      render: (s: any) => (
        <p className="font-medium text-slate-900 dark:text-white">{s.student.name}</p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: any) => (
        <select
          value={s.status}
          onChange={(e) => handleStatusChange(s.student.id, e.target.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium outline-none transition-colors w-full sm:w-auto ${
            statusOptions.find((opt) => opt.value === s.status)?.color || ''
          } bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'note',
      header: 'Note',
      render: (s: any) => (
        <input
          type="text"
          placeholder="Optional note..."
          value={s.note || ''}
          onChange={(e) => handleNoteChange(s.student.id, e.target.value)}
          className="input py-1.5 text-xs"
        />
      ),
    },
  ]

  const exportHeaders = ['Student Name', 'Status', 'Note', 'Date']
  const exportRows = students.map(s => [s.student.name, s.status, s.note || '', date])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <OfflineBanner />
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{className || 'Mark Attendance'}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Select a date and mark attendance</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-full sm:w-auto h-10"
            />
            <ExportButtons 
              title={`Attendance - ${className} - ${date}`}
              headers={exportHeaders}
              rows={exportRows}
              filename={`attendance_${className}_${date}`}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="card p-0 overflow-hidden bg-transparent border-none shadow-none md:bg-white md:dark:bg-slate-800 md:border md:shadow-sm">
              <ResponsiveTable
                columns={columns}
                data={students}
                keyField="student.id"
                emptyMessage="No students in this class"
              />
            </div>


            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-8"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
