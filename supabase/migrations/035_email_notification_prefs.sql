-- 035_email_notification_prefs.sql
--
-- Per-user EMAIL reminder toggles, mirroring the SMS reminder toggles from 026.
-- (Notification preferences live in notification_preferences, keyed by user_id —
-- not on the profiles table.) Defaults mirror the SMS reminder defaults.

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_task_assigned                boolean NOT NULL DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_task_completed_on_my_service boolean NOT NULL DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_my_tasks_overdue             boolean NOT NULL DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_staff_tasks_overdue          boolean NOT NULL DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_task_approaching_deadline    boolean NOT NULL DEFAULT false;  -- UI label: "A task is due tomorrow"
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_new_service_created          boolean NOT NULL DEFAULT false;
