'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ConfirmTaskModal } from './ConfirmTaskModal'
import type { TaskForAllView, StaffOption } from '@/app/tasks/page'
import type { TaskWithProfile } from '@/lib/types'

// ── Urgency bucketing ─────────────────────────────────────────────────────────

type UrgencyKey = 'overdue' | 'today' | 'week' | 'upcoming' | 'nodate'

function getUrgency(task: TaskForAllView): UrgencyKey {
  const serviceDate = task.service.service_date
  if (!serviceDate) return 'nodate'

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const svcMs = new Date(serviceDate + 'T00:00:00').getTime()
  const dueMs = svcMs - task.due_days_before * 86_400_000
  const daysLeft = Math.floor((dueMs - today.getTime()) / 86_400_000)

  if (daysLeft < 0)  return 'overdue'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= 7)  return 'week'
  return 'upcoming'
}

function dueLabelText(task: TaskForAllView): string {
  const serviceDate = task.service.service_date
  if (!serviceDate) return 'No date set'

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const svcMs = new Date(serviceDate + 'T00:00:00').getTime()
  const dueMs = svcMs - task.due_days_before * 86_400_000
  const daysLeft = Math.floor((dueMs - today.getTime()) / 86_400_000)

  if (daysLeft < 0)  return `Overdue by ${Math.abs(daysLeft)}d`
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return 'Due tomorrow'
  return `Due in ${daysLeft}d`
}

const URGENCY_ORDER: UrgencyKey[] = ['overdue', 'today', 'week', 'upcoming', 'nodate']

const URGENCY_META: Record<UrgencyKey, { label: string; color: string; dot: string }> = {
  overdue:  { label: 'Overdue',        color: '#EF4444', dot: '#EF4444' },
  today:    { label: 'Due Today',      color: '#F59E0B', dot: '#F59E0B' },
  week:     { label: 'Due This Week',  color: '#F59E0B', dot: '#F59E0B' },
  upcoming: { label: 'Upcoming',       color: '#94A3B8', dot: '#94A3B8' },
  nodate:   { label: 'No Date Set',    color: '#94A3B8', dot: '#94A3B8' },
}

const PRIORITY_COLOR: Record<string, string> = {
  critical:      '#EF4444',
  standard:      '#F59E0B',
  informational: '#94A3B8',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Three-dot menu ────────────────────────────────────────────────────────────

function ThreeDotMenu({ serviceId }: { serviceId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="p-1.5 rounded hover:opacity-60 transition"
        style={{ color: '#94A3B8' }}
        aria-label="More options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-7 z-50 rounded-lg border shadow-lg py-1 min-w-[140px]"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <Link
            href={`/services/${serviceId}`}
            className="block px-3 py-2 text-sm hover:bg-gray-50 transition"
            style={{ color: '#0F172A' }}
          >
            View Service
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AllTasksViewProps {
  tasks:        TaskForAllView[]
  staffOptions: StaffOption[]
  isStaff:      boolean
}

export function AllTasksView({ tasks: initialTasks, staffOptions, isStaff }: AllTasksViewProps) {
  const router = useRouter()

  const [tasks,          setTasks]          = useState(initialTasks)
  const [searchRaw,      setSearchRaw]      = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [serviceFilter,  setServiceFilter]  = useState('all')
  const [confirmTask,    setConfirmTask]    = useState<TaskForAllView | null>(null)

  // Unique services for the service filter dropdown
  const serviceOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of tasks) seen.set(t.service.id, t.service.deceased_name)
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [tasks])

  const filtered = useMemo(() => {
    const q = searchRaw.toLowerCase().trim()
    return tasks.filter(t => {
      if (q && !t.title.toLowerCase().includes(q) && !t.service.deceased_name.toLowerCase().includes(q)) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (assigneeFilter !== 'all' && (t.assigned_to?.id ?? 'unassigned') !== assigneeFilter) return false
      if (serviceFilter  !== 'all' && t.service.id !== serviceFilter) return false
      return true
    })
  }, [tasks, searchRaw, priorityFilter, assigneeFilter, serviceFilter])

  const grouped = useMemo(() => {
    const buckets: Record<UrgencyKey, TaskForAllView[]> = {
      overdue: [], today: [], week: [], upcoming: [], nodate: [],
    }
    for (const t of filtered) buckets[getUrgency(t)].push(t)
    return buckets
  }, [filtered])

  function handleConfirmed(updated: TaskWithProfile) {
    setTasks(prev => prev.filter(t => t.id !== updated.id))
    setConfirmTask(null)
    router.refresh()
  }

  const totalVisible = filtered.length

  // Build a TaskWithProfile shape for ConfirmTaskModal
  function toTaskWithProfile(t: TaskForAllView): TaskWithProfile {
    return {
      id:                t.id,
      service_id:        t.service.id,
      funeral_home_id:   '',
      title:             t.title,
      category:          '',
      confirmation_hint: t.confirmation_hint,
      due_days_before:   t.due_days_before,
      sort_order:        0,
      assigned_to_id:    t.assigned_to?.id ?? null,
      status:            t.status as any,
      priority:          t.priority as any,
      notes:             t.notes,
      confirmation_value: null,
      completed_by_id:   null,
      completed_at:      null,
      created_at:        '',
      completed_by:      null,
      assigned_to:       t.assigned_to ?? null,
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Tasks</h1>
        <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
          {totalVisible === 0
            ? 'All caught up'
            : `${totalVisible} incomplete task${totalVisible !== 1 ? 's' : ''} across all services`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchRaw}
            onChange={e => setSearchRaw(e.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          />
        </div>

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="standard">Standard</option>
          <option value="informational">Informational</option>
        </select>

        {/* Assignee — fd/owner only */}
        {!isStaff && (
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {staffOptions.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        )}

        {/* Service */}
        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
        >
          <option value="all">All Services</option>
          {serviceOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {totalVisible === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border py-20 text-center"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-60">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>All caught up.</p>
          <p className="mt-1 text-sm" style={{ color: '#475569' }}>No incomplete tasks.</p>
        </div>
      )}

      {/* Grouped task list */}
      {totalVisible > 0 && (
        <div className="space-y-8">
          {URGENCY_ORDER.map(key => {
            const group = grouped[key]
            if (group.length === 0) return null
            const meta = URGENCY_META[key]
            return (
              <div key={key}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, backgroundColor: meta.dot }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#0F172A' }}>
                    {meta.label}
                  </h2>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: key === 'overdue' ? '#FEF2F2' : key === 'today' || key === 'week' ? '#FFFBEB' : '#F1F5F9',
                             color: meta.color }}
                  >
                    {group.length}
                  </span>
                </div>

                {/* Task rows */}
                <div
                  className="rounded-xl border divide-y overflow-hidden"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  {group.map(task => {
                    const dueLabel  = dueLabelText(task)
                    const urgency   = getUrgency(task)
                    const dueColor  = urgency === 'overdue' ? '#EF4444' : urgency === 'today' ? '#F59E0B' : '#94A3B8'

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {/* Priority dot */}
                        <span
                          className="flex-shrink-0 rounded-full"
                          style={{ width: 8, height: 8, backgroundColor: PRIORITY_COLOR[task.priority] ?? '#94A3B8' }}
                          title={task.priority}
                        />

                        {/* Title + service tag */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Link
                              href={`/services/${task.service.id}`}
                              className="text-xs font-medium hover:underline"
                              style={{ color: '#0D6E68' }}
                            >
                              {task.service.deceased_name}
                            </Link>
                            {task.assigned_to && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
                              >
                                <span
                                  className="inline-flex items-center justify-center rounded-full text-white text-[9px] font-bold flex-shrink-0"
                                  style={{ width: 14, height: 14, backgroundColor: '#0D6E68' }}
                                >
                                  {initials(task.assigned_to.full_name)}
                                </span>
                                {task.assigned_to.full_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Due label */}
                        <span
                          className="flex-shrink-0 text-xs font-medium hidden sm:block"
                          style={{ color: dueColor, minWidth: 100, textAlign: 'right' }}
                        >
                          {dueLabel}
                        </span>

                        {/* Mark Complete */}
                        <button
                          type="button"
                          onClick={() => setConfirmTask(task)}
                          className="flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                          style={{ borderColor: '#0D6E68', color: '#0D6E68', backgroundColor: 'transparent' }}
                        >
                          Complete
                        </button>

                        {/* 3-dot menu */}
                        <ThreeDotMenu serviceId={task.service.id} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm modal */}
      {confirmTask && (
        <ConfirmTaskModal
          task={toTaskWithProfile(confirmTask)}
          open={true}
          onClose={() => setConfirmTask(null)}
          onSuccess={handleConfirmed}
        />
      )}
    </>
  )
}
