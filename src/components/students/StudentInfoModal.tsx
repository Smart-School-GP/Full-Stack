'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface StudentInfoModalProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: string
    name: string
    surname?: string
    email: string
    gender?: string
    gradeLevel?: number
    createdAt: string
    studentParents?: any[]
  } | null
}

export default function StudentInfoModal({ isOpen, onClose, student }: StudentInfoModalProps) {
  const router = useRouter()
  const [discussing, setDiscussing] = useState(false)

  if (!student) return null

  const handleOpenPersonalDiscussion = async (userId: string) => {
    setDiscussing(true)
    try {
      const res = await api.post('/api/discussions/boards/find-or-create', {
        type: 'personal',
        targetUserId: userId
      })
      router.push(`/discussions/${res.data.data.id}`)
    } catch (err) {
      console.error(err)
      alert('Failed to open private discussion')
    } finally {
      setDiscussing(false)
    }
  }

  const joinedDate = new Date(student.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100 dark:border-slate-700">
                
                {/* Header Decoration */}
                <div className="h-32 bg-gradient-to-br from-brand-600 to-brand-800 relative">
                  <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-8 pb-10">
                  {/* Profile Image / Avatar */}
                  <div className="relative -mt-16 mb-6">
                    <div className="w-32 h-32 rounded-[2rem] bg-white dark:bg-slate-800 p-2 shadow-xl">
                      <div className="w-full h-full rounded-[1.5rem] bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-4xl font-bold border-2 border-brand-100 dark:border-brand-800">
                        {student.name[0]}
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-24 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-800 shadow-sm" title="Active student" />
                  </div>

                  {/* Identity */}
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {student.name} {student.surname}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Student Profile</p>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{student.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grade Level</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                         {student.gradeLevel ? `Grade ${student.gradeLevel}` : 'Not Assigned'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gender</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{student.gender || 'Not specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Enrollment Date</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{joinedDate}</p>
                    </div>
                  </div>

                  {/* Parents Section */}
                  {student.studentParents && student.studentParents.length > 0 && (
                    <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Guardian Information</p>
                      <div className="space-y-4">
                        {student.studentParents.map((sp: any) => (
                          <div key={sp.parent.id} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                              {sp.parent.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-white">{sp.parent.name} {sp.parent.surname}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{sp.parent.email}</p>
                            </div>
                            <button
                              onClick={() => handleOpenPersonalDiscussion(sp.parent.id)}
                              disabled={discussing}
                              className="ml-auto p-2 text-slate-400 hover:text-brand-500 transition-colors"
                              title="Message Parent"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Links */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleOpenPersonalDiscussion(student.id)}
                      disabled={discussing}
                      className="flex-1 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/30 text-brand-600 dark:text-brand-400 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 group"
                    >
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message Student
                    </button>
                    <a
                      href={`/students/${student.id}/portfolio`}
                      className="flex-1 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 group"
                    >
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View Portfolio
                    </a>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
