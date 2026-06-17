-- Enable RLS on all tables
ALTER TABLE funeral_homes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log         ENABLE ROW LEVEL SECURITY;

-- funeral_homes
CREATE POLICY "funeral_homes_select"
  ON funeral_homes FOR SELECT
  USING (id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

-- profiles
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- services
CREATE POLICY "services_select"
  ON services FOR SELECT
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "services_insert"
  ON services FOR INSERT
  WITH CHECK (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
  );

CREATE POLICY "services_update"
  ON services FOR UPDATE
  USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
  );

-- task_templates (global read-only for all authenticated users)
CREATE POLICY "task_templates_select"
  ON task_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- tasks
CREATE POLICY "tasks_select"
  ON tasks FOR SELECT
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
      OR assigned_to_id = auth.uid()
    )
  );

-- sms_log
CREATE POLICY "sms_log_select"
  ON sms_log FOR SELECT
  USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
  );
