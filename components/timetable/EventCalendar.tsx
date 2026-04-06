'use client'

import dynamic from 'next/dynamic'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

interface CalEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor?: string
  borderColor?: string
  allDay?: boolean
}

interface EventCalendarProps {
  events: CalEvent[]
  onEventClick?: (eventId: string) => void
  initialView?: 'dayGridMonth' | 'dayGridWeek'
}

function EventCalendarInner({ events, onEventClick, initialView = 'dayGridMonth' }: EventCalendarProps) {
  return (
    <div>
      <style>{`
        .fc { font-family: inherit; font-size: 0.8125rem; }
        .fc-toolbar-title { font-size: 0.9375rem; font-weight: 600; }
        .dark .fc { color: #e2e8f0; }
        .dark .fc-theme-standard td,
        .dark .fc-theme-standard th,
        .dark .fc-theme-standard .fc-scrollgrid { border-color: rgb(51 65 85); }
        .dark .fc-col-header-cell { background: rgb(30 41 59); }
        .dark .fc-daygrid-day { background: rgb(15 23 42); }
        .dark .fc-button { background: rgb(51 65 85); border-color: rgb(71 85 105); color: #e2e8f0; }
        .dark .fc-button:hover { background: rgb(71 85 105); }
        .dark .fc-day-today { background: rgb(30 41 59) !important; }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
        events={events}
        height="auto"
        eventClick={onEventClick ? (info) => onEventClick(info.event.id) : undefined}
      />
    </div>
  )
}

const EventCalendarNoSSR = dynamic(
  () => Promise.resolve(EventCalendarInner),
  { ssr: false, loading: () => <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" /> }
)

export default function EventCalendar(props: EventCalendarProps) {
  return <EventCalendarNoSSR {...props} />
}
