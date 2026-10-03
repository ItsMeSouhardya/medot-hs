export function reminderSchemaStatements(sql){return [
  sql`CREATE TABLE IF NOT EXISTS reminder_devices (
    id uuid PRIMARY KEY, credential_hash char(64) NOT NULL UNIQUE,
    endpoint text NOT NULL UNIQUE, subscription jsonb NOT NULL,
    enabled boolean NOT NULL DEFAULT true, expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
  )`,
  sql`CREATE TABLE IF NOT EXISTS medication_reminders (
    id uuid PRIMARY KEY, device_id uuid NOT NULL REFERENCES reminder_devices(id) ON DELETE CASCADE,
    token varchar(22) NOT NULL REFERENCES tags(token), local_time char(5) NOT NULL
      CHECK(local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    language char(2) NOT NULL CHECK(language IN ('en','bn','hi')),
    enabled boolean NOT NULL DEFAULT true, next_due timestamptz NOT NULL,
    UNIQUE(device_id,token,local_time)
  )`,
  sql`CREATE INDEX IF NOT EXISTS medication_reminders_due ON medication_reminders(next_due) WHERE enabled`,
  sql`CREATE TABLE IF NOT EXISTS reminder_registration_throttle (
    bucket_hash char(64) NOT NULL, window_start timestamptz NOT NULL,
    attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 5), PRIMARY KEY(bucket_hash,window_start)
  )`,
];}
