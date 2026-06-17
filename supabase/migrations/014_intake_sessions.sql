CREATE TABLE intake_sessions (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id                 uuid        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  funeral_home_id            uuid        NOT NULL REFERENCES funeral_homes(id),
  created_by_id              uuid        NOT NULL REFERENCES profiles(id),
  recording_duration_seconds int,
  transcript                 text,
  raw_extraction             jsonb,
  status                     text        NOT NULL DEFAULT 'recording'
                                          CHECK (status IN ('recording','transcribing','extracting','complete','failed')),
  error_message              text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE intake_sessions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON intake_sessions TO authenticated, service_role;

CREATE POLICY "intake_sessions_select" ON intake_sessions
  FOR SELECT TO authenticated
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "intake_sessions_insert" ON intake_sessions
  FOR INSERT TO authenticated
  WITH CHECK (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "intake_sessions_update" ON intake_sessions
  FOR UPDATE TO authenticated
  USING (funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid()));
