import { getSql } from "./db";
import { buildTagUrl, isValidToken } from "./domain";
import type { TagStatus } from "./tag-repository";

export type OperatorTagRow = {
  token: string;
  status: TagStatus;
  generic_name: string;
  strength: string;
  dosage_form: string;
  batch_number: string;
  expiry_month: string;
  brand_name?: string | null;
  instruction?: string;
  instruction_bn?: string | null;
  instruction_hi?: string | null;
  created_by?: string | null;
};

export type OperatorTag = {
  token: string;
  status: TagStatus;
  genericName: string;
  strength: string;
  dosageForm: string;
  batchNumber: string;
  expiryMonth: string;
  url: string;
  brandName?: string;
  instruction?: string;
  instructionBn?: string;
  instructionHi?: string;
  createdBy?: string;
};

type RecentTagQuery = () => Promise<OperatorTagRow[]>;
type OneTagQuery = (token: string) => Promise<OperatorTagRow | null>;

function mapTag(row: OperatorTagRow, origin: string): OperatorTag {
  return {
    token: row.token,
    status: row.status,
    genericName: row.generic_name,
    strength: row.strength,
    dosageForm: row.dosage_form,
    batchNumber: row.batch_number,
    expiryMonth: row.expiry_month,
    url: buildTagUrl(row.token, origin),
    ...(row.brand_name ? { brandName: row.brand_name } : {}),
    ...(row.instruction ? { instruction: row.instruction } : {}),
    ...(row.instruction_bn?.trim() ? { instructionBn: row.instruction_bn } : {}),
    ...(row.instruction_hi?.trim() ? { instructionHi: row.instruction_hi } : {}),
    ...(row.created_by ? { createdBy: row.created_by } : {}),
  };
}

async function queryRecentTags(): Promise<OperatorTagRow[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT t.token, t.status, m.generic_name, m.strength, m.dosage_form,
           t.batch_number, t.expiry_month, m.brand_name,
           t.instruction, t.instruction_bn, t.instruction_hi, t.created_by
    FROM tags AS t
    JOIN medicines AS m ON m.id = t.medicine_id
    ORDER BY t.created_at DESC
    LIMIT 50
  `;
  return rows as OperatorTagRow[];
}

async function queryOneTag(token: string): Promise<OperatorTagRow | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT t.token, t.status, m.generic_name, m.strength, m.dosage_form,
           t.batch_number, t.expiry_month, m.brand_name,
           t.instruction, t.instruction_bn, t.instruction_hi, t.created_by
    FROM tags AS t
    JOIN medicines AS m ON m.id = t.medicine_id
    WHERE t.token = ${token}
    LIMIT 1
  `;
  return (rows[0] as OperatorTagRow | undefined) ?? null;
}

export function parseTagReference(reference: string, origin: string): string | null {
  const value = reference.trim();
  if (isValidToken(value)) return value;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(origin).origin || url.search || url.hash) return null;
    const token = url.pathname.startsWith("/m/") ? url.pathname.slice(3) : "";
    return isValidToken(token) ? token : null;
  } catch {
    return null;
  }
}

export async function findOperatorTag(
  token: string,
  origin: string,
  query: OneTagQuery = queryOneTag,
): Promise<OperatorTag | null> {
  if (!isValidToken(token)) return null;
  const row = await query(token);
  return row ? mapTag(row, origin) : null;
}

export async function listOperatorTags(
  origin: string,
  query: RecentTagQuery = queryRecentTags,
): Promise<OperatorTag[]> {
  const rows = await query();
  return rows.map((row) => mapTag(row, origin));
}
