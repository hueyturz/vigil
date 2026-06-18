CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funeral_home_id uuid NOT NULL REFERENCES funeral_homes(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view own funeral home activity" ON activity_log
  FOR SELECT USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "members can insert own funeral home activity" ON activity_log
  FOR INSERT WITH CHECK (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
