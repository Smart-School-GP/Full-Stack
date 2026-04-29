'use client'

import dynamic from 'next/dynamic'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

interface TimetableSlot {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  subject?: { name: string; code?: string }
  teacher?: { name: string }
  room?: string
  color?: string
}

interface SchoolEvent {
  id: string
  title: string
  start: string
  end: string
  color?: string
  eventType?: string
}

interface WeeklyTimetableProps {
  slots: TimetableSlot[]
  events?: SchoolEvent[]
  initialDate?: string
}

function slotToEvent(slot: any) {
  const subjectName = slot.subject?.name || 'Unknown'
  const teacherName = slot.teacher?.name
  const roomName = slot.room?.name || slot.room

  return {
    id: `slot-${slot.id}`,
    title: [subjectName, teacherName, roomName ? `📍${roomName}` : ''].filter(Boolean).join(' · '),
    startTime: slot.startTime,
    endTime: slot.endTime,
    daysOfWeek: [slot.dayOfWeek],
    backgroundColor: slot.color || '#6366f1',
    borderColor: slot.color || '#6366f1',
  }
}

function WeeklyTimetableInner({ slots = [], events = [], initialDate }: WeeklyTimetableProps) {
  const slotEvents = (slots || []).map(slotToEvent)
  const schoolEvents = (events || []).map((e) => ({
    id: `event-${e.id}`,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color || '#f59e0b',
    borderColor: e.color || '#f59e0b',
    allDay: true,
  }))

  return (
    <div className="fullcalendar-wrapper">
      <style>{`
        .fullcalendar-wrapper .fc { font-family: inherit; font-size: 0.8125rem; }
        .fullcalendar-wrapper .fc-toolbar-title { font-size: 1rem; font-weight: 600; }
        .fullcalendar-wrapper .fc-event { border-radius: 6px; padding: 2px 4px; font-size: 0.75rem; cursor: default; }
        .dark .fullcalendar-wrapper .fc { color: #e2e8f0; }
        .dark .fullcalendar-wrapper .fc-theme-standard td,
        .dark .fullcalendar-wrapper .fc-theme-standard th,
        .dark .fullcalendar-wrapper .fc-theme-standard .fc-scrollgrid { border-color: rgb(51 65 85); }
        .dark .fullcalendar-wrapper .fc-col-header-cell { background: rgb(30 41 59); }
        .dark .fullcalendar-wrapper .fc-timegrid-slot { background: rgb(15 23 42); }
        .dark .fullcalendar-wrapper .fc-button { background: rgb(51 65 85); border-color: rgb(71 85 105); color: #e2e8f0; }
        .dark .fullcalendar-wrapper .fc-button:hover { background: rgb(71 85 105); }
      `}</style>
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,timeGridDay',
        }}
        events={[...slotEvents, ...schoolEvents]}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        weekends={false}
        height="auto"
        expandRows
        nowIndicator
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
      />
    </div>
  )
}

const WeeklyTimetableNoSSR = dynamic(
  () => Promise.resolve(WeeklyTimetableInner),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)

export default function WeeklyTimetable(props: WeeklyTimetableProps) {
  return <WeeklyTimetableNoSSR {...props} />
}
