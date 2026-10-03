import type { PublicRecord } from "./tag-repository";
export type ProvenanceEvent = { kind: "CREATED" | "ACTIVATED" | "PAIRING_VERIFIED"; at: string };
export function recordTimestamp(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
export function buildProvenance(record: PublicRecord): { verification: "PAIRING_VERIFIED" | "UNAVAILABLE"; source: "FICTIONAL_DEMO" | "PHYSICAL_PACK" | "LEGACY"; events: ProvenanceEvent[] } {
  const events: ProvenanceEvent[] = [];
  const created = recordTimestamp(record.createdAt), activated = recordTimestamp(record.activatedAt);
  const verified = record.verificationVersion === 1 ? recordTimestamp(record.verifiedAt) : undefined;
  if (created) events.push({ kind: "CREATED", at: created });
  if (activated) events.push({ kind: "ACTIVATED", at: activated });
  if (verified) events.push({ kind: "PAIRING_VERIFIED", at: verified });
  return { verification: verified ? "PAIRING_VERIFIED" : "UNAVAILABLE", source: record.recordKind ?? "LEGACY", events };
}
