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
  const roomName = slot.roomName || slot.room?.name || slot.room

  return {
    id: `slot-${slot.id}`,
    title: subjectName,
    extendedProps: {
      teacher: teacherName,
      room: roomName,
      time: `${slot.startTime} - ${slot.endTime}`
    },
    startTime: slot.startTime,
    endTime: slot.endTime,
    daysOfWeek: [slot.dayOfWeek],
    backgroundColor: slot.color || '#6366f1',
    borderColor: 'transparent',
  }
}

function WeeklyTimetableInner({ slots = [], events = [], initialDate }: WeeklyTimetableProps) {
  const slotEvents = (slots || []).map(slotToEvent)
  const schoolEvents = (events || []).map((e) => ({
    id: `event-${e.id}`,
    title: `📅 ${e.title}`,
    start: e.start,
    end: e.end,
    backgroundColor: e.color || '#f59e0b',
    borderColor: 'transparent',
    allDay: true,
  }))

  return (
    <div className="fullcalendar-wrapper premium-timetable">
      <style>{`
        .premium-timetable .fc { 
          font-family: 'Outfit', sans-serif; 
          --fc-border-color: rgba(226, 232, 240, 0.6);
          --fc-today-bg-color: rgba(99, 102, 241, 0.04);
        }
        .dark .premium-timetable .fc {
          --fc-border-color: rgba(51, 65, 85, 0.5);
          --fc-today-bg-color: rgba(99, 102, 241, 0.08);
        }

        .premium-timetable .fc-toolbar-title { 
          font-size: 1.25rem !important; 
          font-weight: 800 !important;
          background: linear-gradient(to right, #6366f1, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .premium-timetable .fc-col-header-cell {
          padding: 12px 0 !important;
          background: #f8fafc;
        }
        .dark .premium-timetable .fc-col-header-cell {
          background: #0f172a;
        }
        
        .premium-timetable .fc-col-header-cell-cushion {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }

        .premium-timetable .fc-event {
          border: none !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s, box-shadow 0.2s;
          overflow: hidden;
        }
        .premium-timetable .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 5;
        }

        .premium-timetable .fc-v-event .fc-event-main {
          padding: 6px !important;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .event-title { font-weight: 800; font-size: 0.75rem; color: white; line-height: 1.2; }
        .event-time { font-size: 0.65rem; opacity: 0.9; color: white; font-weight: 500; }
        .event-detail { font-size: 0.65rem; opacity: 0.8; color: white; display: flex; items-center gap: 4px; margin-top: 2px; }

        .premium-timetable .fc-timegrid-slot { height: 4rem !important; }
        .premium-timetable .fc-timegrid-axis-cushion { font-size: 0.7rem; font-weight: 600; color: #94a3b8; }
        
        .premium-timetable .fc-button {
          border-radius: 10px !important;
          font-weight: 600 !important;
          font-size: 0.8rem !important;
          text-transform: capitalize !important;
          padding: 6px 12px !important;
          transition: all 0.2s !important;
        }
        
        .premium-timetable .fc-button-primary {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #475569 !important;
        }
        .dark .premium-timetable .fc-button-primary {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }
        
        .premium-timetable .fc-button-primary:hover {
          background-color: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }
        
        .premium-timetable .fc-button-active {
          background-color: #6366f1 !important;
          border-color: #6366f1 !important;
          color: white !important;
        }
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
        eventContent={(eventInfo) => {
          if (eventInfo.event.allDay) return <div className="p-1 font-bold text-xs">{eventInfo.event.title}</div>
          const { teacher, room, time } = eventInfo.event.extendedProps
          return (
            <div className="h-full w-full overflow-hidden">
              <div className="event-time">{time}</div>
              <div className="event-title truncate">{eventInfo.event.title}</div>
              <div className="event-detail truncate">
                <span>👤 {teacher}</span>
                {room && <span>📍 {room}</span>}
              </div>
            </div>
          )
        }}
        slotMinTime="08:00:00"
        slotMaxTime="17:00:00"
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
