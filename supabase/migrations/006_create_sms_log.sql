CREATE TABLE sms_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  funeral_home_id  uuid        NOT NULL,
  service_id       uuid        NOT NULL,
  task_id          uuid,
  recipient_id     uuid        NOT NULL REFERENCES profiles(id),
  message          text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
