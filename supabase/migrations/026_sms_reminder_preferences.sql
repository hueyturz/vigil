-- SMS reminder preferences + per-user reminder timing.
-- Idempotent: only adds columns that don't already exist.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_task_assigned               boolean NOT NULL DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_task_completed_on_my_service boolean NOT NULL DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_my_tasks_overdue            boolean NOT NULL DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_staff_tasks_overdue         boolean NOT NULL DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_task_approaching_deadline   boolean NOT NULL DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_new_service_created         boolean NOT NULL DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS preferred_sms_hour              integer NOT NULL DEFAULT 8;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS timezone                        text    NOT NULL DEFAULT 'America/Denver';

-- The daily reminder sends one combined SMS per user that can span multiple
-- services, so an sms_log row for a reminder has no single service_id.
ALTER TABLE sms_log ALTER COLUMN service_id DROP NOT NULL;
