'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import TimetableBuilder from '@/components/timetable/TimetableBuilder'

function BuilderContent() {
  const searchParams = useSearchParams()
  const initialRoomId = searchParams.get('roomId') || ''

  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId)
  const [loading, setLoading] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/rooms'),
      api.get('/api/admin/users?role=teacher'),
      api.get('/api/timetable/periods'),
    ]).then(([clsRes, teachRes, perRes]) => {
      setRooms(clsRes.rooms || clsRes || [])
      setTeachers(teachRes.users || teachRes || [])
      setPeriods(perRes)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedRoomId) return
    setLoadingSlots(true)
    Promise.all([
      api.get(`/api/timetable/room/${selectedRoomId}`),
      api.get('/api/admin/subjects', { params: { roomId: selectedRoomId } }).catch(() => []),
    ]).then(([slotsRes, subRes]) => {
      setSlots(slotsRes)
      setSubjects(subRes.subjects || subRes || [])
    }).catch(console.error)
    .finally(() => setLoadingSlots(false))
  }, [selectedRoomId])

  const handleAddSlot = async (data: any) => {
    await api.post('/api/timetable/slots', { ...data, roomId: selectedRoomId })
    const res = await api.get(`/api/timetable/room/${selectedRoomId}`)
    setSlots(res)
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

      <div className="card mb-4">
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

      {selectedRoomId && periods.length > 0 && (
        loadingSlots ? (
          <div className="h-64 card animate-pulse bg-slate-100 dark:bg-slate-800" />
        ) : (
          <div className="card overflow-x-auto">
            <TimetableBuilder
              roomId={selectedRoomId}
              periods={periods}
              subjects={subjects}
              teachers={teachers}
              slots={slots}
              onAddSlot={handleAddSlot}
              onDeleteSlot={handleDeleteSlot}
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
