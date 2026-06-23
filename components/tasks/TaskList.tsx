'use client'

import { useState } from 'react'
import { TaskRow } from './TaskRow'
import { AddTaskModal } from './AddTaskModal'
import type { TaskWithProfile } from '@/lib/types'

interface TaskListProps {
  tasks:         TaskWithProfile[]
  serviceDate:   string
  serviceId:     string
  funeralHomeId?: string
  actorId?:       string
  actorName?:     string
}

export function TaskList({
  tasks: initialTasks, serviceDate, serviceId,
  funeralHomeId, actorId, actorName,
}: TaskListProps) {
  const [tasks,   setTasks]   = useState<TaskWithProfile[]>(initialTasks)
  const [addOpen, setAddOpen] = useState(false)

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
                {categoryTasks.map(task => (
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
                ))}
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
