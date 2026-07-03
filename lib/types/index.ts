export type Role = 'owner' | 'fd' | 'staff'
export type Priority = 'critical' | 'standard' | 'informational'
export type ServiceType = 'full-burial' | 'graveside' | 'cremation' | 'military'
export type ServiceStatus = 'active' | 'completed' | 'archived'
export type TaskStatus = 'not-started' | 'complete'
export type ComputedStatus = 'green' | 'yellow' | 'red'
// Mirrors the sms_log status CHECK widened in migration 038 (Twilio delivery
// receipts + opt-out). Keep in sync with that constraint.
export type SmsStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered' | 'opted_out'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended' | 'none'

export interface FuneralHome {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
  // Stripe billing (migration 037)
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: SubscriptionStatus | null
  billing_interval: 'month' | 'year' | null
  trial_ends_at: string | null
  current_period_end: string | null
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

// ── Superadmin / platform-ops view models ──────────────────────────────────────

export interface AdminFuneralHome {
  id: string
  name: string
  address: string | null
  ownerName: string
  ownerEmail: string
  city: string | null
  userCount: number
  activeServices: number
  totalServices: number
  smsSent: number
  smsDeliveryRate: number   // 0-100
  createdAt: string
  lastActivityAt: string | null
}

export interface AdminUser {
  id: string
  funeralHomeId: string
  fullName: string
  email: string
  role: Role
  phone: string | null
  isActive: boolean
  lastLoginAt: string | null
}

export interface AdminSmsLog {
  id: string
  funeralHomeId: string
  funeralHomeName: string
  recipientName: string
  recipientPhone: string | null
  messagePreview: string
  status: SmsStatus
  createdAt: string
}

export interface Service {
  id: string
  funeral_home_id: string
  family_name: string
  deceased_name: string
  service_type: ServiceType | null
  service_date: string | null  // ISO date string 'YYYY-MM-DD'
  location: string | null
  assigned_staff_id: string | null
  created_by_id: string
  status: ServiceStatus
  notes: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  created_at: string
}

export interface ServiceContact {
  id: string
  service_id: string
  funeral_home_id: string
  name: string
  phone: string | null
  email: string | null
  relationship: string | null
  is_primary: boolean
  created_at: string
}

export interface ServiceNote {
  id: string
  service_id: string
  funeral_home_id: string
  author_id: string | null
  author_name: string
  content: string
  created_at: string
}

export interface Tag {
  id: string
  funeral_home_id: string | null   // null = platform default tag
  name: string
  color: string
  is_default: boolean
  created_at: string
}

export interface Task {
  id: string
  service_id: string
  funeral_home_id: string
  title: string
  confirmation_hint: string
  due_days_before: number
  sort_order: number
  assigned_to_id: string | null
  status: TaskStatus
  priority: Priority
  notes: string | null
  confirmation_value: string | null
  completed_by_id: string | null
  completed_at: string | null
  created_at: string
}

export interface TaskTemplate {
  id: string
  funeral_home_id: string | null   // null = system default
  service_type: ServiceType
  title: string
  confirmation_hint: string
  due_days_before: number
  sort_order: number
  priority: Priority
  notes: string | null
  tags?: Tag[]
}

export interface NotificationPreferences {
  id: string
  user_id: string
  funeral_home_id: string
  critical_email: boolean
  critical_sms: boolean
  standard_email: boolean
  standard_sms: boolean
  informational_email: boolean
  informational_sms: boolean
  overdue_email: boolean
  overdue_sms: boolean
  // SMS reminder preferences (migration 026)
  sms_task_assigned: boolean
  sms_task_completed_on_my_service: boolean
  sms_my_tasks_overdue: boolean
  sms_staff_tasks_overdue: boolean
  sms_task_approaching_deadline: boolean   // UI label: "A task is due tomorrow"
  sms_new_service_created: boolean
  // Email reminder preferences (migration 035) — mirror the SMS reminder toggles
  email_task_assigned: boolean
  email_task_completed_on_my_service: boolean
  email_my_tasks_overdue: boolean
  email_staff_tasks_overdue: boolean
  email_task_approaching_deadline: boolean  // UI label: "A task is due tomorrow"
  email_new_service_created: boolean
  preferred_sms_hour: number
  timezone: string
  created_at: string
  updated_at: string
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

export interface ActivityLog {
  id: string
  funeral_home_id: string
  service_id: string | null
  task_id: string | null
  actor_id: string | null
  actor_name: string
  action_type: string
  description: string
  metadata: Record<string, unknown> | null
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
  tags?: Tag[]
}

export interface TaskTemplateSubtask {
  id: string
  template_id: string
  funeral_home_id: string
  title: string
  sort_order: number
  created_at: string
}

export interface TaskSubtask {
  id: string
  task_id: string
  funeral_home_id: string
  title: string
  is_complete: boolean
  sort_order: number
  created_at: string
}

// ── Intake / Meeting Recording ────────────────────────────────────────────────

export type IntakeStatus = 'recording' | 'transcribing' | 'extracting' | 'complete' | 'failed'

export interface ExtractionCaseMetadata {
  decedent_name:   string | null
  service_date_raw: string | null
  venue_name:      string | null
  cemetery_name:   string | null
}

export interface ExtractionTaskConfirmation {
  task_title:         string
  confirmation_value: string
  confidence_score:   number
  anxiety_flag:       boolean
}

export interface ExtractionNewTask {
  title:             string
  confirmation_hint: string
  due_days_before:   number
  priority:          Priority
  extracted_detail:  string
  confidence_score:  number
  anxiety_flag:      boolean
}

export interface ExtractionServiceNote {
  note:            string
  confidence_score: number
}

export interface ExtractionData {
  case_metadata:       ExtractionCaseMetadata
  task_confirmations:  ExtractionTaskConfirmation[]
  new_tasks:           ExtractionNewTask[]
  service_notes:       ExtractionServiceNote[]
}

export interface IntakeSession {
  id:                         string
  service_id:                 string
  funeral_home_id:            string
  created_by_id:              string
  recording_duration_seconds: number | null
  transcript:                 string | null
  raw_extraction:             ExtractionData | null
  ai_summary:                 string | null
  status:                     IntakeStatus
  error_message:              string | null
  created_at:                 string
  updated_at:                 string
}
