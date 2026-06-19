-- 023_fix_rls_grants.sql
-- Documents the manual RLS/grant fixes applied in production on 2026-06-19.
--
-- Background: the Activity tab showed "No activity yet" and task subtasks/
-- profile reads failed for the `authenticated` role. Table-level GRANTs were
-- missing and the activity_log policies were not scoped to `authenticated`,
-- so RLS silently returned zero rows for browser (anon-key) clients.

-- ── Table grants ───────────────────────────────────────────────────────────────
GRANT SELECT ON public.profiles      TO authenticated;
GRANT ALL    ON public.task_subtasks TO authenticated;
GRANT ALL    ON public.activity_log  TO authenticated;
GRANT ALL    ON public.activity_log  TO service_role;

-- ── activity_log policies (recreate scoped to authenticated) ────────────────────
DROP POLICY IF EXISTS "members can insert own funeral home activity" ON activity_log;
DROP POLICY IF EXISTS "members can view own funeral home activity"   ON activity_log;

CREATE POLICY "members can view own funeral home activity" ON activity_log
  FOR SELECT TO authenticated USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "members can insert own funeral home activity" ON activity_log
  FOR INSERT TO authenticated WITH CHECK (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
