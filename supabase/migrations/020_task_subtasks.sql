CREATE TABLE IF NOT EXISTS task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  funeral_home_id uuid NOT NULL REFERENCES funeral_homes(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_complete boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view subtasks" ON task_subtasks
  FOR SELECT USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "members can insert subtasks" ON task_subtasks
  FOR INSERT WITH CHECK (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "members can update subtasks" ON task_subtasks
  FOR UPDATE USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "members can delete subtasks" ON task_subtasks
  FOR DELETE USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
