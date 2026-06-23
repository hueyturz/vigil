-- Authored, dated internal notes per service (replaces the single services.notes blob).
CREATE TABLE service_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      uuid        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  funeral_home_id uuid        NOT NULL REFERENCES funeral_homes(id),
  author_id       uuid        REFERENCES profiles(id),
  author_name     text        NOT NULL,
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_notes_service_id_idx ON service_notes (service_id);

ALTER TABLE service_notes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON service_notes TO authenticated, service_role;

CREATE POLICY "service_notes_select" ON service_notes
  FOR SELECT TO authenticated
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "service_notes_insert" ON service_notes
  FOR INSERT TO authenticated
  WITH CHECK (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "service_notes_update" ON service_notes
  FOR UPDATE TO authenticated
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "service_notes_delete" ON service_notes
  FOR DELETE TO authenticated
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

-- Backfill: preserve any existing single-column notes as one imported note per service.
-- (created_at uses now() — the original edit time wasn't tracked on the column.)
INSERT INTO service_notes (service_id, funeral_home_id, author_name, content, created_at)
SELECT id, funeral_home_id, 'Imported note', notes, now()
FROM services
WHERE notes IS NOT NULL AND btrim(notes) <> '';
