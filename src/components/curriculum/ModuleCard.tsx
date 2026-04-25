'use client'

import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import PathItem from './PathItem'

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

interface ModuleCardProps {
  module: Module
  moduleIndex: number
  isEditing?: boolean
  completedItems?: Set<string>
  lockedModuleIds?: Set<string>
  onCompleteItem?: (itemId: string) => void
  onEditModule?: (module: Module) => void
  onDeleteModule?: (moduleId: string) => void
  onAddItem?: (moduleId: string) => void
  onEditItem?: (item: ModuleItem) => void
  onDeleteItem?: (itemId: string) => void
  dragHandle?: React.ReactNode
}

export default function ModuleCard({
  module,
  moduleIndex,
  isEditing,
  completedItems,
  lockedModuleIds,
  onCompleteItem,
  onEditModule,
  onDeleteModule,
  onAddItem,
  onEditItem,
  onDeleteItem,
  dragHandle,
}: ModuleCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const isLocked = lockedModuleIds?.has(module.id)

  const completedCount = module.items.filter(i => completedItems?.has(i.id)).length
  const progressPct = module.items.length > 0 ? Math.round((completedCount / module.items.length) * 100) : 0

  return (
    <div className={`card ${isLocked ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        {dragHandle}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isLocked && <span className="text-sm">🔒</span>}
            <h3 className="font-semibold text-slate-800 dark:text-white">{module.title}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({completedCount}/{module.items.length})
            </span>
          </div>
          {module.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{module.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && module.items.length > 0 && (
            <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => onEditModule?.(module)}
                className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteModule?.(module.id)}
                className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-500"
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          >
            ▾
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {isEditing ? (
            <Droppable droppableId={module.id} type="ITEM">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[48px] rounded-lg transition-colors ${
                    snapshot.isDraggingOver ? 'bg-brand-50 dark:bg-brand-900/10' : ''
                  }`}
                >
                  {module.items.map((item, itemIndex) => (
                    <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <PathItem
                            item={item}
                            isEditing
                            dragHandle={
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab text-slate-300 hover:text-slate-500 select-none"
                              >
                                ⠿
                              </div>
                            }
                            onEdit={() => onEditItem?.(item)}
                            onDelete={() => onDeleteItem?.(item.id)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {module.items.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">
                      Drag items here or add below
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          ) : (
            <div className="space-y-2">
              {module.items.map((item) => (
                <PathItem
                  key={item.id}
                  item={item}
                  completed={completedItems?.has(item.id)}
                  locked={isLocked}
                  onComplete={!isLocked ? onCompleteItem : undefined}
                />
              ))}
              {module.items.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No items yet</p>
              )}
            </div>
          )}

          {isEditing && onAddItem && (
            <button
              onClick={() => onAddItem(module.id)}
              className="mt-3 w-full text-xs py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              + Add Item
            </button>
          )}
        </>
      )}
    </div>
  )
}
