'use client'

import { useState } from 'react'
import { TaskRow } from './TaskRow'
import type { TaskWithProfile } from '@/lib/types'

interface TaskListProps {
  tasks: TaskWithProfile[]
  serviceDate: string
}

export function TaskList({ tasks: initialTasks, serviceDate }: TaskListProps) {
  // Own task state so category counts re-render when a task is confirmed
  const [tasks, setTasks] = useState<TaskWithProfile[]>(initialTasks)

  function handleTaskComplete(updated: TaskWithProfile) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  // Group tasks preserving the order categories first appear (by sort_order)
  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order)

  const categoryOrder: string[] = []
  const groups: Record<string, TaskWithProfile[]> = {}

  for (const task of sorted) {
    if (!groups[task.category]) {
      categoryOrder.push(task.category)
      groups[task.category] = []
    }
    groups[task.category].push(task)
  }

  return (
    <div className="space-y-6">
      {categoryOrder.map(category => {
        const categoryTasks = groups[category]
        const done  = categoryTasks.filter(t => t.status === 'complete').length
        const total = categoryTasks.length

        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#94A3B8' }}
              >
                {category}
              </h3>
              <span className="text-xs font-medium" style={{ color: '#475569' }}>
                {done}/{total}
              </span>
            </div>

            <div className="space-y-2">
              {categoryTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  serviceDate={serviceDate}
                  onTaskComplete={handleTaskComplete}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
