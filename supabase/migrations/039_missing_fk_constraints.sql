-- 039_missing_fk_constraints.sql
--
-- OPTIONAL / NOT URGENT (battle plan session 10 #9, audit): adds the foreign
-- keys that sms_log and email_log have always lacked, so log rows can't point
-- at deleted tasks/services. ON DELETE SET NULL keeps the log rows (audit
-- trail) while nulling the dangling reference.
--
-- ⚠️ CHECK FOR ORPHANED ROWS BEFORE RUNNING — the ADD CONSTRAINT will fail if
-- any exist. Review and clean (or null out) matches first:
--
--   SELECT id, task_id    FROM sms_log   WHERE task_id    IS NOT NULL AND task_id    NOT IN (SELECT id FROM tasks);
--   SELECT id, service_id FROM sms_log   WHERE service_id IS NOT NULL AND service_id NOT IN (SELECT id FROM services);
--   SELECT id, task_id    FROM email_log WHERE task_id    IS NOT NULL AND task_id    NOT IN (SELECT id FROM tasks);
--
--   -- To null orphans instead of deleting rows, e.g.:
--   -- UPDATE sms_log SET task_id = NULL WHERE task_id IS NOT NULL AND task_id NOT IN (SELECT id FROM tasks);
--
-- Idempotent via DROP CONSTRAINT IF EXISTS + re-ADD. (Note: the columns already
-- exist — ADD COLUMN IF NOT EXISTS would silently no-op, which is why this uses
-- ADD CONSTRAINT.)

ALTER TABLE sms_log DROP CONSTRAINT IF EXISTS sms_log_task_id_fkey;
ALTER TABLE sms_log ADD CONSTRAINT sms_log_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

ALTER TABLE sms_log DROP CONSTRAINT IF EXISTS sms_log_service_id_fkey;
ALTER TABLE sms_log ADD CONSTRAINT sms_log_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

ALTER TABLE email_log DROP CONSTRAINT IF EXISTS email_log_task_id_fkey;
ALTER TABLE email_log ADD CONSTRAINT email_log_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
