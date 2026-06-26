'use client'

import { useState } from 'react'
import { TaskRow } from './TaskRow'
import { AddTaskModal } from './AddTaskModal'
import { updateTaskOrder } from '@/app/services/task-actions'
import type { TaskWithProfile } from '@/lib/types'

interface TaskListProps {
  tasks:         TaskWithProfile[]
  serviceDate:   string
  serviceId:     string
  funeralHomeId?: string
  actorId?:       string
  actorName?:     string
  // Enables drag-to-reorder within a category (owner/fd only).
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

  // Reorder `draggedId` to sit just before `targetId`, within their (shared)
  // category. Sort_order values held by the category are kept as a fixed set of
  // "slots" and reassigned in the new order — this preserves each category's
  // place in the global ordering while changing the order inside it.
  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const dragged = tasks.find(t => t.id === draggedId)
    const target  = tasks.find(t => t.id === targetId)
    if (!dragged || !target || dragged.category !== target.category) return

    const catTasks = tasks
      .filter(t => t.category === dragged.category)
      .sort((a, b) => a.sort_order - b.sort_order)
    const slots = catTasks.map(t => t.sort_order)

    const without   = catTasks.filter(t => t.id !== draggedId)
    const targetIdx = without.findIndex(t => t.id === targetId)
    without.splice(targetIdx, 0, dragged)

    const newOrder = new Map(without.map((t, i) => [t.id, slots[i]]))
    setTasks(prev => prev.map(t => newOrder.has(t.id) ? { ...t, sort_order: newOrder.get(t.id)! } : t))

    // Persist only the rows whose sort_order actually changed.
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

  function handleTaskComplete(updated: TaskWithProfile) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }
  function handleTaskDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }
  function handleTaskUpdate(updated: TaskWithProfile) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }
  function handleTaskAdded(newTask: TaskWithProfile) {
    setTasks(prev => [...prev, newTask])
  }

  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
  const categoryOrder: string[] = []
  const groups: Record<string, TaskWithProfile[]> = {}
  for (const task of sorted) {
    if (!groups[task.category]) { categoryOrder.push(task.category); groups[task.category] = [] }
    groups[task.category].push(task)
  }

  return (
    <>
      <div className="space-y-6">
        {categoryOrder.map(category => {
          const categoryTasks = groups[category]
          const done  = categoryTasks.filter(t => t.status === 'complete').length
          const total = categoryTasks.length

          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                  {category}
                </h3>
                <span className="text-xs font-medium" style={{ color: '#475569' }}>{done}/{total}</span>
              </div>
              <div className="space-y-2">
                {categoryTasks.map(task => {
                  const draggingTask  = draggingId ? tasks.find(t => t.id === draggingId) : null
                  const sameCategory  = !!draggingTask && draggingTask.category === category
                  const showIndicator = canReorder && sameCategory && dragOverId === task.id && draggingId !== task.id
                  return (
                    <div
                      key={task.id}
                      className="relative"
                      onDragOver={canReorder ? (e => {
                        if (!sameCategory) return       // only reorder within the same category
                        e.preventDefault()
                        if (dragOverId !== task.id) setDragOverId(task.id)
                      }) : undefined}
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
              </div>
            </div>
          )
        })}

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
