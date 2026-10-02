import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

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
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS instruction_bn text`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS instruction_hi text`,
  sql`ALTER TABLE tags ADD COLUMN IF NOT EXISTS created_by text`,
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
  ...medicines.map(item => sql`
    INSERT INTO medicines (id, generic_name, strength, dosage_form, brand_name, catalog_status)
    VALUES (${item.id}, ${item.genericName}, ${item.strength}, ${item.dosageForm},
      ${item.brandName ?? null}, ${item.catalogStatus})
    ON CONFLICT (id) DO NOTHING
  `),
]);
const [{ count }] = await sql`SELECT count(*)::int AS count FROM medicines`;
console.log(`MEDOT demo catalog ready: ${count} medicines`);
