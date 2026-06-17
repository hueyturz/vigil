CREATE TABLE notification_preferences (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  funeral_home_id      uuid        NOT NULL REFERENCES funeral_homes(id),
  critical_email       boolean     NOT NULL DEFAULT true,
  critical_sms         boolean     NOT NULL DEFAULT false,
  standard_email       boolean     NOT NULL DEFAULT true,
  standard_sms         boolean     NOT NULL DEFAULT false,
  informational_email  boolean     NOT NULL DEFAULT false,
  informational_sms    boolean     NOT NULL DEFAULT false,
  overdue_email        boolean     NOT NULL DEFAULT true,
  overdue_sms          boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

GRANT ALL ON notification_preferences TO authenticated, service_role;

CREATE POLICY "notif_prefs_select"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notif_prefs_insert"
  ON notification_preferences FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND funeral_home_id = (SELECT funeral_home_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "notif_prefs_update"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());
