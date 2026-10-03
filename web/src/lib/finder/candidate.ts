import { readCurrentRecord, RecordLookupError } from "../public-record";
import type { PublicRecord } from "../tag-repository";
export type CandidateMessage = { records: readonly { recordType: string; data?: DataView }[] };
export function parseCandidateUrl(value: string, origin: string): string | null {
  if (typeof value !== "string" || value.length > 256) return null;
  try {
    const base = new URL(origin), url = new URL(value);
    if (!["http:", "https:"].includes(base.protocol) || base.origin !== origin || url.origin !== origin) return null;
    const token = /^\/m\/([A-Za-z0-9_-]{22})$/.exec(url.pathname)?.[1];
    return token && value === `${origin}/m/${token}` ? token : null;
  } catch { return null; }
}
export function decodeCandidateMessage(message: CandidateMessage, origin: string): string | null {
  try {
    if (message.records.length !== 1) return null;
    const record = message.records[0];
    if (record.recordType !== "url" || !record.data || record.data.byteLength > 256) return null;
    const bytes = new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength);
    return parseCandidateUrl(new TextDecoder("utf-8", { fatal: true }).decode(bytes), origin);
  } catch { return null; }
}
export async function readCandidate(token: string, signal: AbortSignal): Promise<PublicRecord> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) throw new RecordLookupError("unknown");
  return readCurrentRecord(token, signal);
}
