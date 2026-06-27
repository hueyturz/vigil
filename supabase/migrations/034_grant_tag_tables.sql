-- 034_grant_tag_tables.sql
--
-- Root cause of "permission denied for table tags": this project's default
-- privileges do NOT auto-grant new tables to the Supabase roles (see 023, which
-- had to hand-grant tables incl. `GRANT ALL ON activity_log TO service_role`).
-- The tag tables created in 031 were never granted to service_role, so the
-- service-role tag-link routes (which bypass RLS) were still denied at the
-- table-grant level. Grant the tag tables to both roles.
--
-- service_role bypasses RLS; authenticated is still governed by the RLS policies
-- from 032/033. Safe to re-run.

GRANT ALL ON public.tags               TO service_role, authenticated;
GRANT ALL ON public.task_tags          TO service_role, authenticated;
GRANT ALL ON public.template_task_tags TO service_role, authenticated;
