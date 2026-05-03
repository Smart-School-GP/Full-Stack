'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  id: string
  name: string
  description?: string
  image?: string
}

interface SearchableSelectProps {
  label: string
  options: Option[]
  value: string | string[]
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  multiple?: boolean
}

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  error = '',
  multiple = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const values = Array.isArray(value) ? value : value ? [value] : []
  const selectedOptions = options.filter((o) => values.includes(o.id))

  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.description?.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (id: string) => {
    if (multiple) {
      const nextValues = values.includes(id)
        ? values.filter((v) => v !== id)
        : [...values, id]
      onChange(nextValues)
    } else {
      onChange(id)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="label">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`input min-h-[3rem] h-auto py-2 flex flex-wrap gap-2 items-center justify-between cursor-pointer transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-brand-500'
        } ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''} ${error ? 'border-red-500' : ''}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-md text-xs font-bold border border-brand-100 dark:border-brand-800"
              >
                {opt.name}
                {multiple && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleOption(opt.id)
                    }}
                    className="hover:text-brand-900 dark:hover:text-white"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1 scrollbar-hide">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No results found.</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = values.includes(option.id)
                return (
                  <div
                    key={option.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleOption(option.id)
                    }}
                    className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {option.image && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                          <img src={option.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm">{option.name}</p>
                        {option.description && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 font-normal">{option.description}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  )
}
