import { createClient } from '@/lib/supabase/client'

export interface LogActivityParams {
  funeral_home_id: string
  service_id?: string
  task_id?: string
  actor_id: string
  actor_name: string
  action_type:
    | 'task_completed'
    | 'task_assigned'
    | 'task_added'
    | 'task_deleted'
    | 'task_edited'
    | 'notes_updated'
    | 'contact_updated'
    | 'service_completed'
    | 'service_reopened'
  description: string
  metadata?: Record<string, unknown>
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.from('activity_log').insert({
      funeral_home_id: params.funeral_home_id,
      service_id:      params.service_id ?? null,
      task_id:         params.task_id    ?? null,
      actor_id:        params.actor_id,
      actor_name:      params.actor_name,
      action_type:     params.action_type,
      description:     params.description,
      metadata:        params.metadata   ?? null,
    })
  } catch {
    // Silently fail — logging should never break the primary action
  }
}
