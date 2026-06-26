'use client'

import { useState } from 'react'
import { MeetingsTab }      from '@/components/intake/MeetingsTab'
import { TaskList }         from '@/components/tasks/TaskList'
import { ActivityLog }      from '@/components/services/ActivityLog'
import { AddTaskModal }     from '@/components/tasks/AddTaskModal'
import { MultiContactCard } from '@/components/services/MultiContactCard'
import { CaseNotes }        from '@/components/services/CaseNotes'
import { ApplyTemplateBanner } from '@/components/services/ApplyTemplateBanner'
import { useRouter }        from 'next/navigation'
import type { IntakeSession, TaskWithProfile, ServiceContact, ServiceNote } from '@/lib/types'

interface ServiceDetailTabsProps {
  tasks:          TaskWithProfile[]
  serviceDate:    string
  serviceId:      string
  serviceType:    string | null
  funeralHomeId:  string
  actorId:        string
  actorName:      string
  intakeSessions: IntakeSession[]
  contacts:       ServiceContact[]
  notes:          ServiceNote[]
  canRecord:      boolean
  canManage:      boolean
  applyBanner:    React.ReactNode
}

export function ServiceDetailTabs({
  tasks,
  serviceDate,
  serviceId,
  serviceType,
  funeralHomeId,
  actorId,
  actorName,
  intakeSessions,
  contacts,
  notes,
  canRecord,
  canManage,
  applyBanner,
}: ServiceDetailTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tasks' | 'meetings' | 'contacts' | 'notes' | 'activity'>('meetings')
  const [addOpen,   setAddOpen]   = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  // The page passes applyBanner only when there's no service type yet (managers).
  // When it's showing, it already serves as the "get started" guidance for an
  // empty task list, so we don't also show the empty state below.
  const showApplyBanner = !serviceType && canManage && !!applyBanner

  const tabs = [
    { key: 'meetings' as const, label: 'Meetings' },
    { key: 'tasks'    as const, label: 'Tasks'    },
    { key: 'contacts' as const, label: 'Contacts' },
    { key: 'notes'    as const, label: 'Notes'    },
    { key: 'activity' as const, label: 'Activity' },
  ]

  function handleTaskAdded(task: TaskWithProfile) {
    setAddOpen(false)
    // If we're in the no-tasks empty state, refresh to trigger TaskList render
    if (tasks.length === 0) router.refresh()
  }

  return (
    <div>
      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="border-b mb-6 overflow-x-auto scrollbar-hide" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex gap-6">
          {tabs.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="flex-shrink-0 pb-3 text-sm font-semibold capitalize transition"
                style={{
                  color:        active ? '#4A7C8C' : '#94A3B8',
                  borderBottom: active ? '2px solid #4A7C8C' : '2px solid transparent',
                }}
              >
                {tab.label}
                {tab.key === 'meetings' && intakeSessions.length > 0 && (
                  <span
                    className="ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: active ? '#F0FDFA' : '#F1F5F9',
                      color:           active ? '#4A7C8C' : '#94A3B8',
                    }}
                  >
                    {intakeSessions.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div>
          {showApplyBanner && applyBanner}

          {tasks.length > 0 ? (
            <>
              {canManage && (
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
                  >
                    + Add Task
                  </button>
                </div>
              )}
              <TaskList
                tasks={tasks}
                serviceDate={serviceDate}
                serviceId={serviceId}
                funeralHomeId={funeralHomeId}
                actorId={actorId}
                actorName={actorName}
                canReorder={canManage}
              />
            </>
          ) : showApplyBanner ? null : (
            <div className="text-center py-12">
              <div
                className="mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{ width: 48, height: 48, backgroundColor: '#F1F5F9' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <h3 className="text-base font-semibold" style={{ color: '#0F172A' }}>No tasks yet</h3>
              <p className="mt-1 text-sm" style={{ color: '#94A3B8' }}>
                Add tasks manually or apply a template to get started.
              </p>

              {canManage && (
                <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
                  >
                    + Add Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTemplate(v => !v)}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                    style={{ borderColor: '#0A2540', color: '#0A2540' }}
                  >
                    Apply Template
                  </button>
                </div>
              )}

              {canManage && showTemplate && (
                <div className="mt-5 text-left">
                  <ApplyTemplateBanner
                    serviceId={serviceId}
                    funeralHomeId={funeralHomeId}
                    actorId={actorId}
                    actorName={actorName}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meetings tab */}
      {activeTab === 'meetings' && (
        <MeetingsTab
          sessions={intakeSessions}
          serviceId={serviceId}
          canRecord={canRecord}
          notes={notes}
        />
      )}

      {/* Contacts tab */}
      {activeTab === 'contacts' && (
        <MultiContactCard
          serviceId={serviceId}
          funeralHomeId={funeralHomeId}
          initialContacts={contacts}
        />
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <CaseNotes
          serviceId={serviceId}
          funeralHomeId={funeralHomeId}
          actorId={actorId}
          actorName={actorName}
          initialNotes={notes}
        />
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <ActivityLog serviceId={serviceId} />
      )}

      <AddTaskModal
        serviceId={serviceId}
        funeralHomeId={funeralHomeId}
        actorId={actorId}
        actorName={actorName}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleTaskAdded}
      />
    </div>
  )
}
