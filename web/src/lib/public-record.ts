import { z } from "zod";
import { usageSlots } from "./usage-slots";
import type { PublicRecord } from "./tag-repository";
const label = z.string().min(1).max(64), instruction = z.string().min(1).max(500);
const schema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{22}$/), genericName: label, strength: label, dosageForm: label,
  batchNumber: label, expiryMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), instruction,
  brandName: label.optional(), instructionBn: instruction.optional(), instructionHi: instruction.optional(),
  medicineId: label.optional(), usageSlots: z.array(z.enum(usageSlots)).max(5).optional(),
  recordKind: z.enum(["LEGACY", "FICTIONAL_DEMO", "PHYSICAL_PACK"]).optional(),
  infoEn: instruction.optional(), infoBn: instruction.optional(), infoHi: instruction.optional(),
  createdAt: z.iso.datetime().optional(), activatedAt: z.iso.datetime().optional(), verifiedAt: z.iso.datetime().optional(), verificationVersion: z.number().int().optional(),
});
export type RecordFailure = "unknown" | "pending" | "revoked" | "unavailable";
export class RecordLookupError extends Error { constructor(public readonly kind: RecordFailure) { super(kind); } }
export async function readCurrentRecord(token: string, signal: AbortSignal): Promise<PublicRecord> {
  try {
    const response = await fetch(`/api/public/tags/${encodeURIComponent(token)}`, { cache: "no-store", signal });
    const body = await response.json();
    if (!response.ok || body?.kind !== "active") {
      const kind = body?.kind;
      throw new RecordLookupError(kind === "unknown" && response.status === 404 ? "unknown" : kind === "pending" && response.status === 409 ? "pending" : kind === "revoked" && response.status === 410 ? "revoked" : "unavailable");
    }
    const parsed = schema.safeParse(body.record);
    if (!parsed.success || parsed.data.token !== token || !["CURRENT", "EXPIRED"].includes(body.expiryState)) throw new RecordLookupError("unavailable");
    return parsed.data;
  } catch (error) { if (error instanceof RecordLookupError) throw error; throw new RecordLookupError("unavailable"); }
}
