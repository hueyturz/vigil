import type { Task, ComputedStatus } from '@/lib/types'
import { daysUntil } from './date-helpers'

export function isTaskOverdue(task: Task, serviceDate: string): boolean {
  return task.status === 'not-started' && daysUntil(serviceDate) <= task.due_days_before
}

export function computeServiceStatus(tasks: Task[], serviceDate: string): ComputedStatus {
  if (tasks.length === 0) return 'yellow'
  if (tasks.every(t => t.status === 'complete')) return 'green'
  if (tasks.some(t => isTaskOverdue(t, serviceDate))) return 'red'
  return 'yellow'
}
