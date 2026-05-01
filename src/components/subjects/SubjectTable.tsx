'use client'

import React from 'react'
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'

interface SubjectRow {
  id: string
  name: string
  teacherName?: string | null
  teacherId?: string | null
  assignmentCount?: number
  pathCount?: number
  [key: string]: any
}

interface SubjectTableProps {
  subjects: SubjectRow[]
  isAdmin: boolean
  onDelete?: (id: string) => void
  onReassign?: (subjectId: string, teacherId: string) => void
  eligibleTeachers?: { id: string; name: string }[]
  mode: 'room' | 'curriculum'
}

export function SubjectTable({ 
  subjects, 
  isAdmin, 
  onDelete, 
  onReassign, 
  eligibleTeachers = [],
  mode
}: SubjectTableProps) {
  const columns = [
    {
      key: 'name',
      header: 'Subject Name',
      render: (row: SubjectRow) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-white">{row.name}</p>
          {row.type && (
            <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${
              row.type === 'curriculum' ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {row.type === 'curriculum' ? 'Core' : 'Room'}
            </span>
          )}
        </div>
      )
    },
    ...(mode === 'room' ? [
      {
        key: 'teacher',
        header: 'Assigned Teacher',
        render: (row: SubjectRow) => (
          isAdmin ? (
            <select
              className="input !py-1 text-xs max-w-[150px]"
              value={row.teacherId || ''}
              onChange={(e) => onReassign?.(row.id, e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {eligibleTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm">{row.teacherName || 'Not assigned'}</span>
          )
        )
      }
    ] : []),
    {
      key: 'stats',
      header: 'Detailed Info',
      render: (row: SubjectRow) => (
        <div className="flex flex-col gap-1 text-[10px] text-slate-400">
          {row.pathCount !== undefined && <span>{row.pathCount} Learning Paths</span>}
          {row.assignmentCount !== undefined && <span>{row.assignmentCount} Assignments</span>}
        </div>
      )
    },
    ...(isAdmin ? [
      {
        key: 'actions',
        header: 'Actions',
        className: 'text-right',
        render: (row: SubjectRow) => (
          <button
            onClick={() => onDelete?.(row.id)}
            disabled={row.type === 'curriculum'}
            className={`font-bold uppercase tracking-widest text-[10px] ${
              row.type === 'curriculum' ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700'
            }`}
          >
            {row.type === 'curriculum' ? 'Core Course' : 'Delete'}
          </button>
        )
      }
    ] : [])
  ]

  return (
    <ResponsiveTable
      columns={columns}
      data={subjects}
      keyField="id"
      emptyMessage={mode === 'room' ? 'No subjects in this room.' : 'No courses in this program.'}
    />
  )
}
