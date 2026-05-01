'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import TimetableBuilder from '@/components/timetable/TimetableBuilder'

function BuilderContent() {
  const searchParams = useSearchParams()
  const initialRoomId = searchParams.get('roomId') || ''
  const initialMode = (searchParams.get('mode') as 'room' | 'grade') || 'room'
  const initialGrade = searchParams.get('grade') || ''

  const [mode, setMode] = useState<'room' | 'grade'>(initialMode)
  
  const [rooms, setRooms] = useState<any[]>([])
  const [curriculums, setCurriculums] = useState<any[]>([])
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  
  const [subjects, setSubjects] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId)
  const [selectedGrade, setSelectedGrade] = useState(initialGrade)
  
  const [loading, setLoading] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/rooms'),
      api.get('/api/curriculum'),
      api.get('/api/admin/users?role=teacher'),
      api.get('/api/timetable/periods'),
    ]).then(([clsRes, currRes, teachRes, perRes]) => {
      setRooms(clsRes.rooms || clsRes.data || clsRes || [])
      setCurriculums(currRes.data || currRes || [])
      setTeachers(teachRes.users || teachRes.data || teachRes || [])
      setPeriods(perRes.data || perRes || [])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (mode === 'room') {
      if (!selectedRoomId) return
      setLoadingSlots(true)
      const room = rooms.find(r => r.id === selectedRoomId)
      const gradeLevel = room?.gradeLevel

      const requests = [
        api.get(`/api/timetable/room/${selectedRoomId}`),
        api.get('/api/admin/subjects', { params: { roomId: selectedRoomId } }).catch(() => ({ data: [] })),
      ]
      
      if (gradeLevel) {
        requests.push(api.get(`/api/curriculum/grade/${gradeLevel}`).catch(() => ({ data: null })))
      }

      Promise.all(requests).then(([slotsRes, subRes, currRes]) => {
        setSlots(slotsRes.data || slotsRes)
        
        const roomSubjects = (subRes.data?.subjects || subRes.subjects || (Array.isArray(subRes.data) ? subRes.data : null) || (Array.isArray(subRes) ? subRes : null) || [])
          .map((s: any) => ({ ...s, type: 'room' }))
        
        const curriculumSubjects = (currRes?.data?.subjects || currRes?.subjects || [])
          .map((s: any) => ({ ...s, type: 'curriculum' }))

        setSubjects([...roomSubjects, ...curriculumSubjects])
      }).catch(console.error)
      .finally(() => setLoadingSlots(false))
    } else {
      if (!selectedGrade) return
      setLoadingSlots(true)
      Promise.all([
        api.get(`/api/timetable/grade/${selectedGrade}`),
        api.get(`/api/curriculum/grade/${selectedGrade}`).catch(() => ({ data: null })),
      ]).then(([slotsRes, currRes]) => {
        setSlots(slotsRes.data || slotsRes)
        
        const curriculum = currRes.data || currRes
        setSubjects((curriculum?.subjects || []).map((s: any) => ({ ...s, type: 'curriculum' })))
      }).catch(console.error)
      .finally(() => setLoadingSlots(false))
    }
  }, [mode, selectedRoomId, selectedGrade])

  const handleAddSlot = async (data: any) => {
    if (mode === 'room') {
      const subject = subjects.find(s => s.id === data.subjectId)
      await api.post('/api/timetable/slots', { 
        room_id: selectedRoomId,
        subject_id: subject?.type === 'room' ? data.subjectId : undefined,
        curriculum_subject_id: subject?.type === 'curriculum' ? data.subjectId : undefined,
        teacher_id: data.teacherId,
        period_id: data.periodId,
        day_of_week: data.dayOfWeek,
        room: data.room,
        color: data.color,
        effective_from: new Date().toISOString()
      })
      const res = await api.get(`/api/timetable/room/${selectedRoomId}`)
      setSlots(res.data || res)
    } else {
      await api.post('/api/timetable/slots', { 
        grade_level: parseInt(selectedGrade),
        curriculum_subject_id: data.curriculumSubjectId,
        teacher_id: data.teacherId,
        period_id: data.periodId,
        day_of_week: data.dayOfWeek,
        room: data.room,
        color: data.color,
        effective_from: new Date().toISOString()
      })
      const res = await api.get(`/api/timetable/grade/${selectedGrade}`)
      setSlots(res.data || res)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    await api.delete(`/api/timetable/slots/${slotId}`)
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Link href="/admin/timetable" className="hover:text-brand-600">Timetable</Link>
        <span>›</span>
        <span className="text-slate-600 dark:text-slate-300">Builder</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Timetable Builder</h1>
        <Link href="/admin/timetable/periods" className="btn-secondary text-sm">Manage Bell Schedule</Link>
      </div>

      {periods.length === 0 && (
        <div className="p-4 mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ No periods configured. <Link href="/admin/timetable/periods" className="underline">Set up bell schedule first →</Link>
        </div>
      )}

      <div className="card mb-4 flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Build Mode</label>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => { setMode('room'); setSlots([]); setSubjects([]) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'room' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              By Room
            </button>
            <button
              onClick={() => { setMode('grade'); setSlots([]); setSubjects([]) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'grade' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              By Grade
            </button>
          </div>
        </div>

        {mode === 'room' ? (
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Room</label>
            <select
              className="input max-w-xs"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              <option value="">-- Select a room --</option>
              {rooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Grade</label>
            <select
              className="input max-w-xs"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="">-- Select a grade --</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                <option key={grade} value={grade.toString()}>Grade {grade}</option>
              ))}
            </select>
            {selectedGrade && (!subjects || subjects.length === 0) && !loadingSlots && (
               <p className="text-xs text-amber-500 mt-2">No core courses defined for this grade. Please <Link href="/admin/curriculum" className="underline font-semibold">set up the curriculum</Link> first.</p>
            )}
          </div>
        )}
      </div>

      {mode === 'room' && selectedRoomId && (
        <div className="mb-6">
          {(() => {
            const room = rooms.find(r => r.id === selectedRoomId)
            const curriculum = curriculums.find(c => c.gradeLevel === room?.gradeLevel)
            if (!room?.gradeLevel) return null
            return (
              <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-0.5">Assigned Grade Level</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Grade {room.gradeLevel} 
                    {curriculum ? (
                      <span className="px-2 py-0.5 bg-brand-500 text-white text-[9px] rounded-full uppercase tracking-tighter">
                        Curriculum: {curriculum.name || `Grade ${room.gradeLevel}`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">(No curriculum defined for this grade)</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {mode === 'grade' && selectedGrade && (
        <div className="mb-6">
          {(() => {
            const curriculum = curriculums.find(c => c.gradeLevel === parseInt(selectedGrade))
            return (
              <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-0.5">Global Grade Schedule</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Grade {selectedGrade}
                    {curriculum ? (
                      <span className="px-2 py-0.5 bg-brand-500 text-white text-[9px] rounded-full uppercase tracking-tighter">
                        {curriculum.name || `Grade ${selectedGrade} Core`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">(No curriculum defined)</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {((mode === 'room' && selectedRoomId) || (mode === 'grade' && selectedGrade)) && periods.length > 0 && (
        loadingSlots ? (
          <div className="h-64 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        ) : (
          <div className="card overflow-x-auto">
            <TimetableBuilder
              roomId={mode === 'room' ? selectedRoomId : ''}
              periods={periods}
              subjects={subjects}
              teachers={teachers}
              slots={slots}
              onAddSlot={handleAddSlot}
              onDeleteSlot={handleDeleteSlot}
              isGradeMode={mode === 'grade'}
            />
          </div>
        )
      )}
    </div>
  )
}

export default function AdminTimetableBuilderPage() {
  return (
    <Suspense>
      <BuilderContent />
    </Suspense>
  )
}
