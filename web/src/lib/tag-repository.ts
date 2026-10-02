import { getSql } from "./db";
import { isValidToken } from "./domain";
import type { PendingTag, ProvisionRepository } from "./provision";
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
};

export type TagQuery = (token: string) => Promise<TagRow | null>;

async function queryTag(token: string): Promise<TagRow | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT t.token, t.status, m.generic_name, m.strength, m.dosage_form,
           t.batch_number, t.expiry_month, t.instruction
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
    },
  };
}

export const provisionRepository: ProvisionRepository = {
  async medicineExists(id) {
    const sql = getSql();
    const rows = await sql`SELECT 1 FROM medicines WHERE id = ${id} LIMIT 1`;
    return rows.length > 0;
  },
  async insertPending(record: PendingTag) {
    const sql = getSql();
    await sql`
      INSERT INTO tags
        (token, medicine_id, batch_number, expiry_month, instruction, status)
      VALUES
        (${record.token}, ${record.medicineId}, ${record.batchNumber},
         ${record.expiryMonth}, ${record.instruction}, 'PENDING')
    `;
  },
};

export const lifecycleRepository: LifecycleRepository = {
  async setActiveIfPending(token) {
    const sql = getSql();
    const rows = await sql`
      UPDATE tags SET status = 'ACTIVE', activated_at = now()
      WHERE token = ${token} AND status = 'PENDING'
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
