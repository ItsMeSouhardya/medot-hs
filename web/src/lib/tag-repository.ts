import { getSql } from "./db";
import { isValidToken } from "./domain";
import { ProvisionError, type PendingTag, type ProvisionRepository } from "./provision";
import type { LifecycleRepository } from "./tag-lifecycle";

export type TagStatus = "PENDING" | "ACTIVE" | "REVOKED";

export type PublicRecord = {
  token: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  batchNumber: string;
  expiryMonth: string;
  instruction: string;
  brandName?: string;
  instructionBn?: string;
  instructionHi?: string;
};

export type TagLookup =
  | { kind: "active"; record: PublicRecord }
  | { kind: "pending" }
  | { kind: "revoked" }
  | { kind: "unknown" };

export type TagRow = {
  token: string;
  status: TagStatus;
  generic_name: string;
  strength: string;
  dosage_form: string;
  batch_number: string;
  expiry_month: string;
  instruction: string;
  brand_name?: string | null;
  instruction_bn?: string | null;
  instruction_hi?: string | null;
};

export type TagQuery = (token: string) => Promise<TagRow | null>;

async function queryTag(token: string): Promise<TagRow | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT t.token, t.status, m.generic_name, m.strength, m.dosage_form,
           t.batch_number, t.expiry_month, t.instruction,
           m.brand_name, t.instruction_bn, t.instruction_hi
    FROM tags AS t
    JOIN medicines AS m ON m.id = t.medicine_id
    WHERE t.token = ${token}
    LIMIT 1
  `;
  return (rows[0] as TagRow | undefined) ?? null;
}

export async function resolveTag(
  token: string,
  query: TagQuery = queryTag,
): Promise<TagLookup> {
  if (!isValidToken(token)) return { kind: "unknown" };
  const row = await query(token);
  if (!row) return { kind: "unknown" };
  if (row.status === "PENDING") return { kind: "pending" };
  if (row.status === "REVOKED") return { kind: "revoked" };
  return {
    kind: "active",
    record: {
      token: row.token,
      genericName: row.generic_name,
      strength: row.strength,
      dosageForm: row.dosage_form,
      batchNumber: row.batch_number,
      expiryMonth: row.expiry_month,
      instruction: row.instruction,
      ...(row.brand_name ? { brandName: row.brand_name } : {}),
      ...(row.instruction_bn?.trim() ? { instructionBn: row.instruction_bn } : {}),
      ...(row.instruction_hi?.trim() ? { instructionHi: row.instruction_hi } : {}),
    },
  };
}

export const provisionRepository: ProvisionRepository = {
  async medicineExists(id) {
    const sql = getSql();
    const rows = await sql`SELECT 1 FROM medicines WHERE id = ${id} AND catalog_status = 'DEMO_READY' LIMIT 1`;
    return rows.length > 0;
  },
  async insertPending(record: PendingTag) {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO tags
        (token, medicine_id, batch_number, expiry_month, instruction,
         instruction_bn, instruction_hi, created_by, status)
      SELECT ${record.token}, m.id, ${record.batchNumber},
             ${record.expiryMonth}, ${record.instruction}, ${record.instructionBn},
             ${record.instructionHi ?? null}, ${record.createdBy ?? null}, 'PENDING'
      FROM medicines AS m
      WHERE m.id = ${record.medicineId} AND m.catalog_status = 'DEMO_READY'
      RETURNING token
    `;
    if (rows.length !== 1) throw new ProvisionError("UNKNOWN_MEDICINE");
  },
};

export const lifecycleRepository: LifecycleRepository = {
  async setActiveIfPending(token) {
    const sql = getSql();
    const rows = await sql`
      UPDATE tags SET status = 'ACTIVE', activated_at = now()
      WHERE token = ${token} AND status = 'PENDING'
        AND length(btrim(instruction)) BETWEEN 1 AND 500
        AND length(btrim(instruction_bn)) BETWEEN 1 AND 500
        AND (instruction_hi IS NULL OR length(btrim(instruction_hi)) BETWEEN 1 AND 500)
        AND EXISTS (SELECT 1 FROM medicines WHERE id = tags.medicine_id AND catalog_status = 'DEMO_READY')
      RETURNING token
    `;
    return rows.length === 1;
  },
  async setRevokedIfUsable(token) {
    const sql = getSql();
    const rows = await sql`
      UPDATE tags SET status = 'REVOKED', revoked_at = now()
      WHERE token = ${token} AND status IN ('PENDING', 'ACTIVE')
      RETURNING token
    `;
    return rows.length === 1;
  },
};
