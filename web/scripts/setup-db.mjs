import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { sharingSchemaStatements } from "./sharing-schema.mjs";
import { reminderSchemaStatements } from "./reminder-schema.mjs";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const medicines = JSON.parse(await readFile(new URL("../src/data/medicine-catalog.json", import.meta.url), "utf8"));
if (!Array.isArray(medicines) || new Set(medicines.map(item => item.id)).size !== medicines.length ||
  medicines.some(item => !["DEMO_READY", "PACK_CHECK_REQUIRED"].includes(item.catalogStatus) ||
    [item.id, item.genericName, item.strength, item.dosageForm].some(value => typeof value !== "string" || !value.trim()))) {
  throw new Error("Invalid demo catalog; database setup was not started");
}
const sql = neon(process.env.DATABASE_URL);

// One atomic, additive migration. Existing identities/instructions/statuses are
// never replaced by catalog edits, and draft prescriptions are never seeded.
await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS medicines (
    id text PRIMARY KEY, generic_name text NOT NULL,
    strength text NOT NULL, dosage_form text NOT NULL
  )`,
  sql`CREATE TABLE IF NOT EXISTS tags (
    token varchar(22) PRIMARY KEY,
    medicine_id text NOT NULL REFERENCES medicines(id),
    batch_number text NOT NULL, expiry_month char(7) NOT NULL,
    instruction text NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    activated_at timestamptz, revoked_at timestamptz
  )`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS brand_name text`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'DEMO_READY'
    CHECK (catalog_status IN ('DEMO_READY', 'PACK_CHECK_REQUIRED'))`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS record_kind text NOT NULL DEFAULT 'LEGACY'
    CHECK (record_kind IN ('LEGACY', 'FICTIONAL_DEMO', 'PHYSICAL_PACK'))`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS info_en text`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS info_bn text`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS info_hi text`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS created_by text`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS creation_request_id uuid UNIQUE`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS readiness_reviewed_at timestamptz`,
  sql`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS readiness_reviewed_by text`,
  sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicines_paired_notes' AND conrelid = 'medicines'::regclass) THEN
      ALTER TABLE medicines ADD CONSTRAINT medicines_paired_notes CHECK (
        (info_en IS NULL AND info_bn IS NULL AND info_hi IS NULL) OR
        (info_en IS NOT NULL AND info_bn IS NOT NULL AND length(btrim(info_en)) BETWEEN 1 AND 500
          AND length(btrim(info_bn)) BETWEEN 1 AND 500
          AND (info_hi IS NULL OR length(btrim(info_hi)) BETWEEN 1 AND 500)));
    END IF;
  END $$`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS instruction_bn text`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS instruction_hi text`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS created_by text`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS usage_slots text[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(usage_slots) <= 5 AND usage_slots <@ ARRAY['MORNING','AFTERNOON','EVENING','NIGHT','AS_NEEDED']::text[] AND array_position(usage_slots, NULL) IS NULL)`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS verified_at timestamptz`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS verification_version integer CHECK (verification_version IS NULL OR verification_version = 1)`,
  sql`CREATE TABLE IF NOT EXISTS tag_audio (
    token varchar(22) NOT NULL REFERENCES tags(token),
    language text NOT NULL CHECK (language IN ('en', 'bn', 'hi')),
    content_hash text NOT NULL, audio_base64 text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (token, language)
  )`,
  sql`CREATE TABLE IF NOT EXISTS speech_budget (
    day date PRIMARY KEY,
    generation_count integer NOT NULL CHECK (generation_count >= 0)
  )`,
  sql`ALTER TABLE tag_audio ADD COLUMN IF NOT EXISTS script_kind text NOT NULL DEFAULT 'full'
    CHECK (script_kind IN ('full','instructions','expiry','details'))`,
  sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'tag_audio'::regclass AND contype = 'p'
      AND pg_get_constraintdef(oid) = 'PRIMARY KEY (token, language, script_kind)') THEN
      ALTER TABLE tag_audio DROP CONSTRAINT tag_audio_pkey;
      ALTER TABLE tag_audio ADD CONSTRAINT tag_audio_pkey PRIMARY KEY (token, language, script_kind);
    END IF;
  END $$`,
  sql`CREATE TABLE IF NOT EXISTS speech_throttle (
    token varchar(22) PRIMARY KEY REFERENCES tags(token), last_attempt_at timestamptz NOT NULL
  )`,
  ...sharingSchemaStatements(sql),
  ...reminderSchemaStatements(sql),
  ...medicines.map(item => sql`
    INSERT INTO medicines (id, generic_name, strength, dosage_form, brand_name, catalog_status)
    VALUES (${item.id}, ${item.genericName}, ${item.strength}, ${item.dosageForm},
      ${item.brandName ?? null}, ${item.catalogStatus})
    ON CONFLICT (id) DO NOTHING
  `),
]);
const [{ count }] = await sql`SELECT count(*)::int AS count FROM medicines`;
console.log(`MEDOT demo catalog ready: ${count} medicines`);
