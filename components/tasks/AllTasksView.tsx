'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TaskRow } from './TaskRow'
import type { TaskForAllView, StaffOption } from '@/app/tasks/page'
import type { TaskWithProfile, Tag } from '@/lib/types'

// ── Urgency bucketing ─────────────────────────────────────────────────────────

type UrgencyKey = 'overdue' | 'today' | 'week' | 'upcoming' | 'nodate'

function getUrgency(task: TaskForAllView): UrgencyKey {
  const serviceDate = task.service.service_date
  if (!serviceDate) return 'nodate'
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  const dueMs  = new Date(serviceDate + 'T00:00:00').getTime() - task.due_days_before * 86_400_000
  const daysLeft = Math.floor((dueMs - today.getTime()) / 86_400_000)
  if (daysLeft < 0)   return 'overdue'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= 7)  return 'week'
  return 'upcoming'
}

const URGENCY_ORDER: UrgencyKey[] = ['overdue', 'today', 'week', 'upcoming', 'nodate']

const URGENCY_META: Record<UrgencyKey, { label: string; dotColor: string; badgeBg: string; badgeColor: string }> = {
  overdue:  { label: 'Overdue',       dotColor: '#EF4444', badgeBg: '#FEF2F2', badgeColor: '#EF4444' },
  today:    { label: 'Due Today',     dotColor: '#F59E0B', badgeBg: '#FFFBEB', badgeColor: '#F59E0B' },
  week:     { label: 'Due This Week', dotColor: '#F59E0B', badgeBg: '#FFFBEB', badgeColor: '#F59E0B' },
  upcoming: { label: 'Upcoming',      dotColor: '#94A3B8', badgeBg: '#F1F5F9', badgeColor: '#94A3B8' },
  nodate:   { label: 'No Date Set',   dotColor: '#94A3B8', badgeBg: '#F1F5F9', badgeColor: '#94A3B8' },
}

// ── Main component ────────────────────────────────────────────────────────────

interface AllTasksViewProps {
  tasks:         TaskForAllView[]
  staffOptions:  StaffOption[]
  isStaff:       boolean
  funeralHomeId: string
  actorId:       string
  actorName:     string
  initialTag?:   string | null
}

export function AllTasksView({
  tasks: initialTasks,
  staffOptions,
  isStaff,
  funeralHomeId,
  actorId,
  actorName,
  initialTag,
}: AllTasksViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tasks,          setTasks]          = useState<TaskForAllView[]>(initialTasks)
  const [searchRaw,      setSearchRaw]      = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [serviceFilter,  setServiceFilter]  = useState('all')
  const [urgencyFilter,  setUrgencyFilter]  = useState<'all' | UrgencyKey>('all')
  const [tagFilter,      setTagFilter]      = useState('all')

  // Apply the ?filter= query param on mount (e.g. dashboard "Overdue Tasks" card).
  useEffect(() => {
    if (searchParams.get('filter') === 'overdue') setUrgencyFilter('overdue')
  }, [searchParams])

  // Unique tags present on any visible task (for the filter chip row).
  const tagFilters = useMemo<Tag[]>(() => {
    const byId = new Map<string, Tag>()
    for (const t of tasks) for (const tag of t.tags ?? []) if (!byId.has(tag.id)) byId.set(tag.id, tag)
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks])

  // Pre-activate a tag from ?tag=<name> (e.g. arriving from Cmd+K).
  useEffect(() => {
    if (!initialTag) return
    const match = tagFilters.find(t => t.name.toLowerCase() === initialTag.toLowerCase())
    if (match) setTagFilter(match.id)
  }, [initialTag, tagFilters])

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
      if (urgencyFilter  !== 'all' && getUrgency(t) !== urgencyFilter) return false
      if (tagFilter      !== 'all' && !(t.tags ?? []).some(tag => tag.id === tagFilter)) return false
      return true
    })
  }, [tasks, searchRaw, priorityFilter, assigneeFilter, serviceFilter, urgencyFilter, tagFilter])

  const grouped = useMemo(() => {
    const buckets: Record<UrgencyKey, TaskForAllView[]> = {
      overdue: [], today: [], week: [], upcoming: [], nodate: [],
    }
    for (const t of filtered) buckets[getUrgency(t)].push(t)
    return buckets
  }, [filtered])

  function handleTaskComplete(updated: TaskWithProfile) {
    setTasks(prev => prev.filter(t => t.id !== updated.id))
    router.refresh()
  }

  function handleTaskDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    router.refresh()
  }

  function handleTaskUpdate(updated: TaskWithProfile) {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
  }

  const totalVisible = filtered.length

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
      <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3 mb-6">
        <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
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

        {/* Priority + Assignee side by side on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="w-full sm:w-auto rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="standard">Standard</option>
            <option value="informational">Informational</option>
          </select>

          {!isStaff && (
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {staffOptions.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          )}
        </div>

        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
          className="w-full sm:w-auto rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
        >
          <option value="all">All Services</option>
          {serviceOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select
          value={urgencyFilter}
          onChange={e => setUrgencyFilter(e.target.value as 'all' | UrgencyKey)}
          className="w-full sm:w-auto rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
        >
          <option value="all">All Urgency</option>
          {URGENCY_ORDER.map(key => (
            <option key={key} value={key}>{URGENCY_META[key].label}</option>
          ))}
        </select>

        {/* Tags — hidden when no visible task has tags */}
        {tagFilters.length > 0 && (
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            className="w-full sm:w-auto rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          >
            <option value="all">All Tags</option>
            {tagFilters.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Empty state */}
      {totalVisible === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border py-20 text-center"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="1.5"
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
                  <span className="rounded-full flex-shrink-0"
                    style={{ width: 8, height: 8, backgroundColor: meta.dotColor }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#0F172A' }}>
                    {meta.label}
                  </h2>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: meta.badgeBg, color: meta.badgeColor }}
                  >
                    {group.length}
                  </span>
                </div>

                {/* One TaskRow per task; service name shows inline in the row */}
                <div className="space-y-2">
                  {group.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      serviceDate={task.service.service_date ?? ''}
                      serviceId={task.service.id}
                      serviceName={task.service.deceased_name}
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
        </div>
      )}
    </>
  )
}
