-- 029_cascade_deletes.sql
--
-- Make deleting a funeral_homes row tear down all of its tenant data
-- automatically, so the admin "delete funeral home" action is a single
-- DELETE instead of a hand-rolled, easy-to-get-wrong cascade in app code.
--
-- This re-points every foreign key that references funeral_homes(id) to use
-- ON DELETE CASCADE. All of these constraints were created inline and unnamed,
-- so Postgres auto-named them `<table>_funeral_home_id_fkey`; DROP ... IF EXISTS
-- makes each statement safe to re-run.
--
-- NOTE: this does NOT remove the members' auth.users rows — those live in the
-- auth schema and are not reachable by a cascade from funeral_homes. The
-- deleteFuneralHome server action still deletes those auth users explicitly.

-- ── FKs that previously had NO cascade — add it ─────────────────────────────

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_funeral_home_id_fkey,
  ADD CONSTRAINT profiles_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE services
  DROP CONSTRAINT IF EXISTS services_funeral_home_id_fkey,
  ADD CONSTRAINT services_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_funeral_home_id_fkey,
  ADD CONSTRAINT tasks_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE email_log
  DROP CONSTRAINT IF EXISTS email_log_funeral_home_id_fkey,
  ADD CONSTRAINT email_log_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_funeral_home_id_fkey,
  ADD CONSTRAINT notification_preferences_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE intake_sessions
  DROP CONSTRAINT IF EXISTS intake_sessions_funeral_home_id_fkey,
  ADD CONSTRAINT intake_sessions_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE service_notes
  DROP CONSTRAINT IF EXISTS service_notes_funeral_home_id_fkey,
  ADD CONSTRAINT service_notes_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

-- ── sms_log: funeral_home_id existed as a bare column with NO foreign key.
--    Add the FK (with cascade) so deletes clean it up too.
--    If this fails, an sms_log row has a funeral_home_id with no matching
--    funeral_homes row — clean up the orphan(s) before re-running.

ALTER TABLE sms_log
  DROP CONSTRAINT IF EXISTS sms_log_funeral_home_id_fkey,
  ADD CONSTRAINT sms_log_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

-- ── FKs that ALREADY had ON DELETE CASCADE — re-asserted so this migration is
--    the single source of truth for the cascade invariant (idempotent). ──────

ALTER TABLE task_templates
  DROP CONSTRAINT IF EXISTS task_templates_funeral_home_id_fkey,
  ADD CONSTRAINT task_templates_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE activity_log
  DROP CONSTRAINT IF EXISTS activity_log_funeral_home_id_fkey,
  ADD CONSTRAINT activity_log_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE task_subtasks
  DROP CONSTRAINT IF EXISTS task_subtasks_funeral_home_id_fkey,
  ADD CONSTRAINT task_subtasks_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE task_template_subtasks
  DROP CONSTRAINT IF EXISTS task_template_subtasks_funeral_home_id_fkey,
  ADD CONSTRAINT task_template_subtasks_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;

ALTER TABLE service_contacts
  DROP CONSTRAINT IF EXISTS service_contacts_funeral_home_id_fkey,
  ADD CONSTRAINT service_contacts_funeral_home_id_fkey
    FOREIGN KEY (funeral_home_id) REFERENCES funeral_homes(id) ON DELETE CASCADE;
