export function sharingSchemaStatements(sql){return [
  sql`CREATE TABLE IF NOT EXISTS sharing_groups (
    id uuid PRIMARY KEY, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    owner_code_hash char(64) NOT NULL UNIQUE, owner_code_expires_at timestamptz NOT NULL,
    enabled boolean NOT NULL DEFAULT false, scope_status boolean NOT NULL DEFAULT false,
    scope_details boolean NOT NULL DEFAULT false, consent_expires_at timestamptz,
    consent_version integer NOT NULL DEFAULT 0 CHECK(consent_version >= 0),
    CHECK(NOT scope_details OR scope_status), CHECK(NOT enabled OR (scope_status AND consent_expires_at IS NOT NULL)))`,
  sql`CREATE TABLE IF NOT EXISTS sharing_members (
    group_id uuid NOT NULL REFERENCES sharing_groups(id) ON DELETE CASCADE,
    token varchar(22) NOT NULL REFERENCES tags(token), alias text NOT NULL,
    selected boolean NOT NULL DEFAULT false, PRIMARY KEY(group_id,token), UNIQUE(group_id,alias))`,
  sql`CREATE TABLE IF NOT EXISTS sharing_owner_sessions (
    id uuid PRIMARY KEY, group_id uuid NOT NULL REFERENCES sharing_groups(id) ON DELETE CASCADE,
    credential_hash char(64) NOT NULL UNIQUE, consent_version integer NOT NULL,
    expires_at timestamptz NOT NULL, management_only boolean NOT NULL DEFAULT true, revoked_at timestamptz)`,
  sql`CREATE TABLE IF NOT EXISTS caregiver_invites (
    id uuid PRIMARY KEY, group_id uuid NOT NULL REFERENCES sharing_groups(id) ON DELETE CASCADE,
    secret_hash char(64) NOT NULL UNIQUE, scope_status boolean NOT NULL, scope_details boolean NOT NULL,
    consent_version integer NOT NULL, expires_at timestamptz NOT NULL,
    redeemed_at timestamptz, redeemed_by text, CHECK(NOT scope_details OR scope_status))`,
  sql`CREATE TABLE IF NOT EXISTS caregiver_grants (
    id uuid PRIMARY KEY, group_id uuid NOT NULL REFERENCES sharing_groups(id) ON DELETE CASCADE,
    clerk_user_id text NOT NULL, scope_status boolean NOT NULL, scope_details boolean NOT NULL,
    consent_version integer NOT NULL, granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
    CHECK(NOT scope_details OR scope_status))`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS caregiver_grants_active ON caregiver_grants(group_id,clerk_user_id) WHERE revoked_at IS NULL`,
  sql`CREATE TABLE IF NOT EXISTS identification_check_ins (
    group_id uuid NOT NULL, token varchar(22) NOT NULL,
    slot text NOT NULL CHECK(slot IN ('MORNING','AFTERNOON','EVENING','NIGHT','AS_NEEDED','UNCLASSIFIED')),
    day date NOT NULL, identified_at timestamptz NOT NULL DEFAULT now(),
    outcome text NOT NULL CHECK(outcome IN ('CURRENT_LABEL','EXPIRED_LABEL')),
    PRIMARY KEY(group_id,token,slot,day), FOREIGN KEY(group_id,token) REFERENCES sharing_members(group_id,token) ON DELETE CASCADE)`,
  sql`CREATE INDEX IF NOT EXISTS identification_check_ins_retention ON identification_check_ins(identified_at)`,
  sql`CREATE TABLE IF NOT EXISTS sharing_exchange_throttle (
    bucket_hash char(64) NOT NULL, window_start timestamptz NOT NULL,
    attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 5), PRIMARY KEY(bucket_hash,window_start))`,
];}
