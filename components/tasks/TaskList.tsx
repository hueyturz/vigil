'use client'

import { useState, useMemo } from 'react'
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set())

  // PointerSensor handles mouse, touch, and pen via pointer events (works on
  // mobile). The small distance constraint lets taps/clicks through so tapping a
  // row still expands it and only a deliberate drag starts a reorder.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Move the active task to the dropped position. The set of sort_order values is
  // preserved and reassigned in the new order, then persisted per changed task.
  function reorder(activeId: string, overId: string) {
    if (activeId === overId) return
    const ordered = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
    const slots   = ordered.map(t => t.sort_order)
    const from    = ordered.findIndex(t => t.id === activeId)
    const to      = ordered.findIndex(t => t.id === overId)
    if (from === -1 || to === -1 || from === to) return

    const moved    = arrayMove(ordered, from, to)
    const newOrder = new Map(moved.map((t, i) => [t.id, slots[i]]))
    setTasks(prev => prev.map(t => newOrder.has(t.id) ? { ...t, sort_order: newOrder.get(t.id)! } : t))
    for (const t of moved) {
      const next = newOrder.get(t.id)!
      if (t.sort_order !== next) void updateTaskOrder(t.id, next)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) reorder(String(active.id), String(over.id))
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
        {canReorder ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visible.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {visible.map(task => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  serviceDate={serviceDate}
                  serviceId={serviceId}
                  funeralHomeId={funeralHomeId}
                  actorId={actorId}
                  actorName={actorName}
                  onTaskComplete={handleTaskComplete}
                  onTaskDelete={handleTaskDelete}
                  onTaskUpdate={handleTaskUpdate}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          visible.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              serviceDate={serviceDate}
              serviceId={serviceId}
              funeralHomeId={funeralHomeId}
              actorId={actorId}
              actorName={actorName}
              onTaskComplete={handleTaskComplete}
              onTaskDelete={handleTaskDelete}
              onTaskUpdate={handleTaskUpdate}
            />
          ))
        )}

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

// A single sortable row: registers with dnd-kit and hands the drag handle props
// (listeners/attributes) down to TaskRow's ⋮⋮ handle so dragging only starts there.
type SortableTaskRowProps = Omit<React.ComponentProps<typeof TaskRow>, 'canReorder' | 'dragHandleProps'>

function SortableTaskRow(props: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex:  isDragging ? 10 : undefined,
    position: 'relative',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow
        {...props}
        canReorder
        dragHandleProps={{ attributes, listeners, setActivatorNodeRef }}
      />
    </div>
  )
}
