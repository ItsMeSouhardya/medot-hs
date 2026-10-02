import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS medicines (
    id text PRIMARY KEY,
    generic_name text NOT NULL,
    strength text NOT NULL,
    dosage_form text NOT NULL
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS tags (
    token varchar(22) PRIMARY KEY,
    medicine_id text NOT NULL REFERENCES medicines(id),
    batch_number text NOT NULL,
    expiry_month char(7) NOT NULL,
    instruction text NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    activated_at timestamptz,
    revoked_at timestamptz
  )
`;

const medicines = [
  ["metformin-500", "Metformin", "500 mg", "Tablet"],
  ["amlodipine-5", "Amlodipine", "5 mg", "Tablet"],
  ["atorvastatin-10", "Atorvastatin", "10 mg", "Tablet"],
  ["pantoprazole-40", "Pantoprazole", "40 mg", "Tablet"],
  ["paracetamol-500", "Paracetamol", "500 mg", "Tablet"],
];

for (const [id, name, strength, form] of medicines) {
  await sql`
    INSERT INTO medicines (id, generic_name, strength, dosage_form)
    VALUES (${id}, ${name}, ${strength}, ${form})
    ON CONFLICT (id) DO NOTHING
  `;
}

const [{ count }] = await sql`SELECT count(*)::int AS count FROM medicines`;
console.log(`MEDOT demo catalog ready: ${count} medicines`);
