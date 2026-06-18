'use client'

import { useState } from 'react'
import { MeetingsTab }  from '@/components/intake/MeetingsTab'
import { TaskList }     from '@/components/tasks/TaskList'
import { ActivityLog }  from '@/components/services/ActivityLog'
import type { IntakeSession, TaskWithProfile } from '@/lib/types'

interface ServiceDetailTabsProps {
  tasks:          TaskWithProfile[]
  serviceDate:    string
  serviceId:      string
  serviceType:    string | null
  funeralHomeId:  string
  actorId:        string
  actorName:      string
  intakeSessions: IntakeSession[]
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
  canRecord,
  canManage,
  applyBanner,
}: ServiceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'meetings' | 'activity'>('tasks')

  const tabs = [
    { key: 'tasks'    as const, label: 'Tasks'    },
    { key: 'meetings' as const, label: 'Meetings' },
    { key: 'activity' as const, label: 'Activity' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-6 border-b mb-6" style={{ borderColor: '#E2E8F0' }}>
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

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <ActivityLog serviceId={serviceId} />
      )}
    </div>
  )
}
