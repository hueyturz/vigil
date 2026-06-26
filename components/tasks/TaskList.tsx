'use client'

import { useState, useMemo } from 'react'
import { TaskRow } from './TaskRow'
import { AddTaskModal } from './AddTaskModal'
import { updateTaskOrder } from '@/app/services/task-actions'
import { tint } from '@/components/tags/colors'
import type { TaskWithProfile, Tag } from '@/lib/types'

interface TaskListProps {
  tasks:         TaskWithProfile[]
  serviceDate:   string
  serviceId:     string
  funeralHomeId?: string
  actorId?:       string
  actorName?:     string
  // Enables drag-to-reorder (owner/fd only).
  canReorder?:    boolean
}

export function TaskList({
  tasks: initialTasks, serviceDate, serviceId,
  funeralHomeId, actorId, actorName, canReorder,
}: TaskListProps) {
  const [tasks,   setTasks]   = useState<TaskWithProfile[]>(initialTasks)
  const [addOpen, setAddOpen] = useState(false)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set())

  // Reorder `draggedId` to sit just before `targetId` in the flat list. The set
  // of sort_order values is preserved and reassigned in the new order.
  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const ordered = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
    const slots   = ordered.map(t => t.sort_order)
    const dragged = ordered.find(t => t.id === draggedId)
    if (!dragged) return

    const without   = ordered.filter(t => t.id !== draggedId)
    const targetIdx = without.findIndex(t => t.id === targetId)
    if (targetIdx === -1) return
    without.splice(targetIdx, 0, dragged)

    const newOrder = new Map(without.map((t, i) => [t.id, slots[i]]))
    setTasks(prev => prev.map(t => newOrder.has(t.id) ? { ...t, sort_order: newOrder.get(t.id)! } : t))
    for (const t of without) {
      const next = newOrder.get(t.id)!
      if (t.sort_order !== next) void updateTaskOrder(t.id, next)
    }
  }

  function handleDrop(targetId: string) {
    if (draggingId) reorder(draggingId, targetId)
    setDraggingId(null)
    setDragOverId(null)
  }

  function handleTaskComplete(updated: TaskWithProfile) { setTasks(prev => prev.map(t => t.id === updated.id ? updated : t)) }
  function handleTaskDelete(taskId: string)             { setTasks(prev => prev.filter(t => t.id !== taskId)) }
  function handleTaskUpdate(updated: TaskWithProfile)   { setTasks(prev => prev.map(t => t.id === updated.id ? updated : t)) }
  function handleTaskAdded(newTask: TaskWithProfile)    { setTasks(prev => [...prev, newTask]) }

  // Unique tags present on any task in this service (for the filter chip row).
  const tagFilters = useMemo<Tag[]>(() => {
    const byId = new Map<string, Tag>()
    for (const t of tasks) for (const tag of t.tags ?? []) if (!byId.has(tag.id)) byId.set(tag.id, tag)
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks])

  function toggleTag(id: string) {
    setActiveTagIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const sorted   = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
  // OR logic: a task matches if it has ANY active tag. No active tags → show all.
  const visible  = activeTagIds.size === 0
    ? sorted
    : sorted.filter(t => (t.tags ?? []).some(tag => activeTagIds.has(tag.id)))

  return (
    <>
      {/* Tag filter chips — hidden entirely when no task has tags */}
      {tagFilters.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveTagIds(new Set())}
            className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition"
            style={activeTagIds.size === 0
              ? { backgroundColor: '#0A2540', color: '#F4C95D', borderColor: '#0A2540' }
              : { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#E2E8F0' }}
          >
            All
          </button>
          {tagFilters.map(tag => {
            const active = activeTagIds.has(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition"
                style={active
                  ? { backgroundColor: tint(tag.color, 0.15), color: tag.color, borderColor: tag.color }
                  : { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#E2E8F0' }}
              >
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        {visible.map(task => {
          const showIndicator = canReorder && dragOverId === task.id && draggingId !== task.id
          return (
            <div
              key={task.id}
              className="relative"
              onDragOver={canReorder ? (e => { e.preventDefault(); if (dragOverId !== task.id) setDragOverId(task.id) }) : undefined}
              onDrop={canReorder ? (e => { e.preventDefault(); handleDrop(task.id) }) : undefined}
            >
              {showIndicator && (
                <div className="absolute left-0 right-0 -top-1 h-0.5 rounded-full" style={{ backgroundColor: '#4A7C8C' }} />
              )}
              <div style={{ opacity: draggingId === task.id ? 0.5 : 1 }}>
                <TaskRow
                  task={task}
                  serviceDate={serviceDate}
                  serviceId={serviceId}
                  funeralHomeId={funeralHomeId}
                  actorId={actorId}
                  actorName={actorName}
                  onTaskComplete={handleTaskComplete}
                  onTaskDelete={handleTaskDelete}
                  onTaskUpdate={handleTaskUpdate}
                  canReorder={canReorder}
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                />
              </div>
            </div>
          )
        })}

        {visible.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>No tasks match the selected tags.</p>
        )}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 text-sm font-medium transition hover:opacity-70"
          style={{ color: '#4A7C8C' }}
        >
          <span className="text-lg leading-none">+</span> Add Task
        </button>
      </div>

      <AddTaskModal
        serviceId={serviceId}
        funeralHomeId={funeralHomeId}
        actorId={actorId}
        actorName={actorName}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleTaskAdded}
      />
    </>
  )
}
