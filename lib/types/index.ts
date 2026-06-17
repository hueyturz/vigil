export type Role = 'owner' | 'fd' | 'staff'
export type ServiceType = 'full-burial' | 'graveside' | 'cremation' | 'military'
export type ServiceStatus = 'active' | 'completed' | 'archived'
export type TaskStatus = 'not-started' | 'complete'
export type ComputedStatus = 'green' | 'yellow' | 'red'
export type SmsStatus = 'pending' | 'sent' | 'failed'

export interface FuneralHome {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
}

export interface Profile {
  id: string
  funeral_home_id: string
  full_name: string
  role: Role
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  funeral_home_id: string
  family_name: string
  deceased_name: string
  service_type: ServiceType
  service_date: string       // ISO date string 'YYYY-MM-DD'
  location: string
  assigned_staff_id: string | null
  created_by_id: string
  status: ServiceStatus
  notes: string | null
  created_at: string
}

export interface Task {
  id: string
  service_id: string
  funeral_home_id: string
  title: string
  category: string
  confirmation_hint: string
  due_days_before: number
  sort_order: number
  assigned_to_id: string | null
  status: TaskStatus
  confirmation_value: string | null
  completed_by_id: string | null
  completed_at: string | null
  created_at: string
}

export interface TaskTemplate {
  id: string
  service_type: ServiceType
  title: string
  category: string
  confirmation_hint: string
  due_days_before: number
  sort_order: number
}

export interface SmsLog {
  id: string
  funeral_home_id: string
  service_id: string
  task_id: string | null
  recipient_id: string
  message: string
  status: SmsStatus
  created_at: string
}

// Extended types for joined queries
export interface ServiceWithTasks extends Service {
  tasks: Task[]
}

export interface ServiceWithProfile extends Service {
  assigned_staff: Pick<Profile, 'id' | 'full_name'> | null
}

export interface TaskWithProfile extends Task {
  completed_by: Pick<Profile, 'id' | 'full_name'> | null
  assigned_to: Pick<Profile, 'id' | 'full_name'> | null
}
