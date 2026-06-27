-- 033_tag_link_rls.sql
--
-- The tag API routes now run as the authenticated user (cookie-based client) so
-- RLS applies. The 031 link-table policies only allowed a tag whose
-- funeral_home_id matched the user — which EXCLUDES the platform default tags
-- (funeral_home_id NULL, is_default = true). Without this, an authenticated user
-- could not attach a Standard tag to a task/template.
--
-- New policies allow a link when (a) the task/template belongs to the user's
-- funeral home AND (b) the tag is either a default or one of the user's own.

DROP POLICY IF EXISTS task_tags_all ON task_tags;
CREATE POLICY task_tags_all ON task_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
        AND t.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM tags g
      WHERE g.id = task_tags.tag_id
        AND (g.is_default OR g.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
        AND t.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM tags g
      WHERE g.id = task_tags.tag_id
        AND (g.is_default OR g.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS template_task_tags_all ON template_task_tags;
CREATE POLICY template_task_tags_all ON template_task_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM task_templates tt
      WHERE tt.id = template_task_tags.template_task_id
        AND tt.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM tags g
      WHERE g.id = template_task_tags.tag_id
        AND (g.is_default OR g.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_templates tt
      WHERE tt.id = template_task_tags.template_task_id
        AND tt.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM tags g
      WHERE g.id = template_task_tags.tag_id
        AND (g.is_default OR g.funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()))
    )
  );
