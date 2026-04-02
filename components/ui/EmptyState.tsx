import React from 'react'

interface Props {
  title: string
  message: string
  icon?: React.ReactNode
}

export default function EmptyState({ title, message, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && (
        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">{message}</p>
    </div>
  )
}
