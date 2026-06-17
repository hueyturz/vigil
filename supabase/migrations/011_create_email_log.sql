CREATE TABLE email_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  funeral_home_id  uuid        REFERENCES funeral_homes(id),
  service_id       uuid        REFERENCES services(id),
  task_id          uuid,
  recipient_id     uuid        REFERENCES profiles(id),
  recipient_email  text        NOT NULL,
  subject          text        NOT NULL,
  status           text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_log_select"
  ON email_log FOR SELECT
  USING (
    funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'fd')
  );
