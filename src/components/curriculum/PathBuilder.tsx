'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import ModuleCard from './ModuleCard'

interface ModuleItem {
  id: string
  title: string
  description?: string
  itemType: string
  contentUrl?: string
  durationMinutes?: number
  orderIndex: number
  isRequired: boolean
}

interface Module {
  id: string
  title: string
  description?: string
  orderIndex: number
  items: ModuleItem[]
}

interface PathBuilderProps {
  modules: Module[]
  onChange: (modules: Module[]) => void
  onSaveModule: (moduleId: string | null, data: Partial<Module>) => Promise<void>
  onDeleteModule: (moduleId: string) => Promise<void>
  onSaveItem: (moduleId: string, itemId: string | null, data: Partial<ModuleItem>) => Promise<void>
  onDeleteItem: (itemId: string) => Promise<void>
  onReorderModules: (orderedIds: string[]) => Promise<void>
  onReorderItems: (moduleId: string, orderedIds: string[]) => Promise<void>
}

const ITEM_TYPES = ['video', 'reading', 'quiz', 'assignment', 'resource']

export default function PathBuilder({
  modules,
  onChange,
  onSaveModule,
  onDeleteModule,
  onSaveItem,
  onDeleteItem,
  onReorderModules,
  onReorderItems,
}: PathBuilderProps) {
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [editingItem, setEditingItem] = useState<{ moduleId: string; item?: ModuleItem } | null>(null)
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' })
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    itemType: 'reading',
    contentUrl: '',
    durationMinutes: '',
    isRequired: true,
  })
  const [saving, setSaving] = useState(false)

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, type } = result
      if (!destination) return
      if (source.droppableId === destination.droppableId && source.index === destination.index) return

      if (type === 'MODULE') {
        const reordered = Array.from(modules)
        const [removed] = reordered.splice(source.index, 1)
        reordered.splice(destination.index, 0, removed)
        const updated = reordered.map((m, i) => ({ ...m, orderIndex: i }))
        onChange(updated)
        await onReorderModules(updated.map((m) => m.id))
      } else if (type === 'ITEM') {
        const srcModule = modules.find((m) => m.id === source.droppableId)
        const dstModule = modules.find((m) => m.id === destination.droppableId)
        if (!srcModule || !dstModule) return

        if (source.droppableId === destination.droppableId) {
          const newItems = Array.from(srcModule.items)
          const [removed] = newItems.splice(source.index, 1)
          newItems.splice(destination.index, 0, removed)
          const updated = modules.map((m) =>
            m.id === srcModule.id ? { ...m, items: newItems.map((it, i) => ({ ...it, orderIndex: i })) } : m
          )
          onChange(updated)
          await onReorderItems(srcModule.id, newItems.map((i) => i.id))
        } else {
          const srcItems = Array.from(srcModule.items)
          const dstItems = Array.from(dstModule.items)
          const [removed] = srcItems.splice(source.index, 1)
          dstItems.splice(destination.index, 0, removed)
          const updated = modules.map((m) => {
            if (m.id === srcModule.id) return { ...m, items: srcItems }
            if (m.id === dstModule.id) return { ...m, items: dstItems }
            return m
          })
          onChange(updated)
          await onReorderItems(dstModule.id, dstItems.map((i) => i.id))
        }
      }
    },
    [modules, onChange, onReorderModules, onReorderItems]
  )

  const openAddModule = () => {
    setEditingModule(null)
    setModuleForm({ title: '', description: '' })
  }

  const openEditModule = (mod: Module) => {
    setEditingModule(mod)
    setModuleForm({ title: mod.title, description: mod.description || '' })
  }

  const submitModule = async () => {
    if (!moduleForm.title.trim()) return
    setSaving(true)
    try {
      await onSaveModule(editingModule?.id || null, moduleForm)
      setEditingModule(undefined as any)
      setModuleForm({ title: '', description: '' })
    } finally {
      setSaving(false)
    }
  }

  const openAddItem = (moduleId: string) => {
    setEditingItem({ moduleId })
    setItemForm({ title: '', description: '', itemType: 'reading', contentUrl: '', durationMinutes: '', isRequired: true })
  }

  const openEditItem = (item: ModuleItem, moduleId: string) => {
    setEditingItem({ moduleId, item })
    setItemForm({
      title: item.title,
      description: item.description || '',
      itemType: item.itemType,
      contentUrl: item.contentUrl || '',
      durationMinutes: item.durationMinutes?.toString() || '',
      isRequired: item.isRequired,
    })
  }

  const submitItem = async () => {
    if (!editingItem || !itemForm.title.trim()) return
    setSaving(true)
    try {
      await onSaveItem(editingItem.moduleId, editingItem.item?.id || null, {
        ...itemForm,
        durationMinutes: itemForm.durationMinutes ? parseInt(itemForm.durationMinutes) : undefined,
      } as any)
      setEditingItem(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="MODULES" type="MODULE">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 min-h-[80px] rounded-xl transition-colors ${
                snapshot.isDraggingOver ? 'bg-brand-50/50 dark:bg-brand-900/5' : ''
              }`}
            >
              {modules.map((mod, index) => (
                <Draggable key={mod.id} draggableId={mod.id} index={index}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps}>
                      <ModuleCard
                        module={mod}
                        moduleIndex={index}
                        isEditing
                        dragHandle={
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab text-slate-300 hover:text-slate-500 select-none px-1"
                          >
                            ⠿
                          </div>
                        }
                        onEditModule={openEditModule}
                        onDeleteModule={async (id) => { await onDeleteModule(id) }}
                        onAddItem={openAddItem}
                        onEditItem={(item) => openEditItem(item, mod.id)}
                        onDeleteItem={async (id) => { await onDeleteItem(id) }}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {modules.length === 0 && (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  No modules yet. Add your first module below.
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        onClick={openAddModule}
        className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors text-sm font-medium"
      >
        + Add Module
      </button>

      {/* Module Modal */}
      {moduleForm.title !== undefined && editingModule !== undefined && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              {editingModule ? 'Edit Module' : 'Add Module'}
            </h3>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Module title *"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              />
              <textarea
                className="input"
                placeholder="Description (optional)"
                rows={3}
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={submitModule} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditingModule(undefined as any)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              {editingItem.item ? 'Edit Item' : 'Add Item'}
            </h3>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Item title *"
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
              />
              <select
                className="input"
                value={itemForm.itemType}
                onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value })}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Description (optional)"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              />
              <input
                className="input"
                placeholder="Content URL (optional)"
                value={itemForm.contentUrl}
                onChange={(e) => setItemForm({ ...itemForm, contentUrl: e.target.value })}
              />
              <input
                className="input"
                type="number"
                placeholder="Duration (minutes)"
                value={itemForm.durationMinutes}
                onChange={(e) => setItemForm({ ...itemForm, durationMinutes: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={itemForm.isRequired}
                  onChange={(e) => setItemForm({ ...itemForm, isRequired: e.target.checked })}
                  className="rounded"
                />
                Required to complete module
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={submitItem} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditingItem(null)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
