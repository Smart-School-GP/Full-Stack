'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <div className="h-40 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 animate-pulse" />
  ),
})

const MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'code'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block', 'link'],
    ['clean'],
  ],
}

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike', 'code',
  'list', 'bullet', 'blockquote', 'code-block', 'link',
]

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  readOnly?: boolean
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  minHeight = 160,
  readOnly = false,
}: RichTextEditorProps) {
  return (
    <div className="rich-editor">
      <style>{`
        .rich-editor .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          font-size: 0.875rem;
          min-height: ${minHeight}px;
        }
        .rich-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
        .dark .rich-editor .ql-container,
        .dark .rich-editor .ql-toolbar {
          border-color: rgb(71 85 105);
          color: #e2e8f0;
          background: rgb(30 41 59);
        }
        .dark .rich-editor .ql-toolbar .ql-stroke {
          stroke: #94a3b8;
        }
        .dark .rich-editor .ql-toolbar .ql-fill {
          fill: #94a3b8;
        }
        .dark .rich-editor .ql-picker {
          color: #94a3b8;
        }
        .dark .rich-editor .ql-editor.ql-blank::before {
          color: #64748b;
        }
        .rich-editor .ql-editor {
          min-height: ${minHeight}px;
        }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={readOnly ? { toolbar: false } : MODULES}
        formats={FORMATS}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  )
}
