CREATE TABLE IF NOT EXISTS task_template_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  funeral_home_id uuid NOT NULL REFERENCES funeral_homes(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_template_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view template subtasks" ON task_template_subtasks
  FOR SELECT USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "members can insert template subtasks" ON task_template_subtasks
  FOR INSERT WITH CHECK (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "members can update template subtasks" ON task_template_subtasks
  FOR UPDATE USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "members can delete template subtasks" ON task_template_subtasks
  FOR DELETE USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

GRANT ALL ON task_template_subtasks TO authenticated, service_role;
