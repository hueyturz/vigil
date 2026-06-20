'use client'

import { useState } from 'react'
import { MeetingsTab }      from '@/components/intake/MeetingsTab'
import { TaskList }         from '@/components/tasks/TaskList'
import { ActivityLog }      from '@/components/services/ActivityLog'
import { AddTaskModal }     from '@/components/tasks/AddTaskModal'
import { MultiContactCard } from '@/components/services/MultiContactCard'
import { CaseNotes }        from '@/components/services/CaseNotes'
import { useRouter }        from 'next/navigation'
import type { IntakeSession, TaskWithProfile, ServiceContact } from '@/lib/types'

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
  notes:          string | null
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
      {/* Tab bar + Add Task button */}
      <div className="flex items-center justify-between border-b mb-6" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex gap-6">
          {tabs.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="pb-3 text-sm font-semibold capitalize transition"
                style={{
                  color:        active ? '#0D6E68' : '#94A3B8',
                  borderBottom: active ? '2px solid #0D6E68' : '2px solid transparent',
                }}
              >
                {tab.label}
                {tab.key === 'meetings' && intakeSessions.length > 0 && (
                  <span
                    className="ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: active ? '#F0FDFA' : '#F1F5F9',
                      color:           active ? '#0D6E68' : '#94A3B8',
                    }}
                  >
                    {intakeSessions.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {canManage && activeTab === 'tasks' && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mb-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#0D6E68' }}
          >
            + Add Task
          </button>
        )}
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div>
          {!serviceType && canManage && applyBanner}
          {tasks.length > 0 ? (
            <TaskList
              tasks={tasks}
              serviceDate={serviceDate}
              serviceId={serviceId}
              funeralHomeId={funeralHomeId}
              actorId={actorId}
              actorName={actorName}
            />
          ) : serviceType ? (
            <p className="text-sm text-center py-12" style={{ color: '#94A3B8' }}>
              No tasks found for this service.
            </p>
          ) : null}
        </div>
      )}

      {/* Meetings tab */}
      {activeTab === 'meetings' && (
        <MeetingsTab
          sessions={intakeSessions}
          serviceId={serviceId}
          canRecord={canRecord}
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
