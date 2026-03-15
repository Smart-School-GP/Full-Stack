'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/teacher/classes')
      .then((res) => setClasses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
          <p className="text-slate-500 mt-1">Mark and view class attendance</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : classes.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No classes assigned</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/teacher/attendance/${cls.id}`}>
                <div className="card hover:shadow-md hover:border-brand-200 transition-all cursor-pointer">
                  <h3 className="font-semibold text-slate-800">{cls.name}</h3>
                  {cls.gradeLevel && (
                    <p className="text-xs text-slate-400 mt-0.5">Grade {cls.gradeLevel}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <span className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded">
                      Mark Attendance
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
