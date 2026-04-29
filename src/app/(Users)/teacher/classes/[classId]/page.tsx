'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/ui/DashboardLayout'
import Link from 'next/link'
import api from '@/lib/api'
import AwardBadgeModal from '@/components/badges/AwardBadgeModal'
import StudentInfoModal from '@/components/students/StudentInfoModal'

export default function TeacherRoomDetailPage() {
  const { classId } = useParams()
  const roomId = Array.isArray(classId) ? classId[0] : classId
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState('')
  const [gradeLevel, setGradeLevel] = useState<string | number | null>(null)
  const [discussing, setDiscussing] = useState(false)

  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [badgeTargetUser, setBadgeTargetUser] = useState<{ id: string, name: string } | null>(null)
  
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)

  const load = async () => {
    try {
      const [studentsRes, subjectsRes, roomsRes] = await Promise.all([
        api.get(`/api/teacher/rooms/${roomId}/students`),
        api.get(`/api/teacher/rooms/${roomId}/subjects`),
        api.get('/api/teacher/rooms'),
      ])
      setStudents(studentsRes.data)
      setSubjects(subjectsRes.data)
      const cls = roomsRes.data.find((c: any) => c.id === roomId)
      setClassName(cls?.name || '')
      setGradeLevel(cls?.gradeLevel ?? null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDiscussion = async (type: 'class' | 'class_parents') => {
    setDiscussing(true)
    try {
      const res = await api.post('/api/discussions/boards/find-or-create', {
        type,
        roomId
      })
      router.push(`/discussions/${res.data.data.id}`)
    } catch (err) {
      console.error(err)
      alert('Failed to open discussion board')
    } finally {
      setDiscussing(false)
    }
  }

  useEffect(() => {
    if (!roomId) return
    load()
  }, [roomId])

  const quickActions = [
    {
      label: 'Mark Attendance',
      href: `/teacher/attendance/${roomId}`,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30',
    },
    {
      label: 'Attendance History',
      href: `/teacher/attendance/${roomId}/history`,
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30',
    },
    {
      label: 'Risk Alerts',
      href: '/teacher/risk-alerts',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30',
    },
    {
      label: 'Sentiment AI',
      href: '/teacher/dashboard/sentiment-dashboard',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
      color: 'bg-pink-50 text-pink-700 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:hover:bg-pink-900/30',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-2">
          <Link href="/teacher/rooms" className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors">Rooms</Link>
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-300">{className || '...'}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{className || 'Room'}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {gradeLevel != null && <span className="font-medium text-slate-600 dark:text-slate-300">Grade {gradeLevel} · </span>}
              {students.length} {students.length === 1 ? 'student' : 'students'} · {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'} you teach
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition-all hover:scale-105 border border-transparent hover:border-current shadow-sm ${a.color}`}
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
              </svg>
              {a.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Discussions and Subjects */}
            <div className="lg:col-span-2 space-y-8">
              {/* Specialized Discussion Boards */}
              <div className="card p-0 overflow-hidden bg-white dark:bg-slate-800 shadow-sm border-slate-100 dark:border-slate-700">
                <div className="p-5 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Class Discussion Boards</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Collaborative spaces for this room</p>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleOpenDiscussion('class')}
                    disabled={discussing}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/10 dark:hover:bg-brand-900/20 border border-brand-100 dark:border-brand-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">Class Discussion</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Students & Teachers</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleOpenDiscussion('class_parents')}
                    disabled={discussing}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/10 dark:hover:bg-purple-900/20 border border-purple-100 dark:border-purple-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">Parents Board</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Guardians & Teachers</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Subjects */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Your Subjects</h2>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
                  </span>
                </div>

                {subjects.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center py-12 px-6">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      No subjects assigned yet. Ask your school admin to assign you a subject in this room.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects.map((subj) => (
                      <Link key={subj.id} href={`/teacher/subjects/${subj.id}`}>
                        <div className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-11 h-11 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0">
                              {subj.name[0]}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                                {subj.name}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {subj._count.assignments} {subj._count.assignments === 1 ? 'assignment' : 'assignments'} ·{' '}
                                {subj.gradingAlgorithm ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Algorithm set</span>
                                ) : (
                                  <Link
                                    href={`/teacher/subjects/${subj.id}/algorithm`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                                  >
                                    Set grading algorithm →
                                  </Link>
                                )}
                              </p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Students Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Roster</h2>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {students.length} {students.length === 1 ? 'student' : 'students'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                {students.length === 0 ? (
                  <p className="p-6 text-sm text-slate-400 dark:text-slate-500 text-center">No students enrolled</p>
                ) : (
                  <ul className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {students.map((s) => (
                      <li key={s.id} className="relative">
                        <button
                          onClick={() => { setSelectedStudent(s); setShowInfoModal(true) }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group text-left"
                        >
                          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {s.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                              {s.name} {s.surname || ''}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{s.email}</p>
                          </div>
                          <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setBadgeTargetUser({ id: s.id, name: s.name }); setShowBadgeModal(true) }}
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 z-10"
                          title="Award Badge"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <AwardBadgeModal
          isOpen={showBadgeModal}
          onClose={() => { setShowBadgeModal(false); setBadgeTargetUser(null) }}
          studentId={badgeTargetUser?.id || ''}
          studentName={badgeTargetUser?.name || ''}
        />

        <StudentInfoModal
          isOpen={showInfoModal}
          onClose={() => { setShowInfoModal(false); setSelectedStudent(null) }}
          student={selectedStudent}
        />
      </div>
    </DashboardLayout>
  )
}
