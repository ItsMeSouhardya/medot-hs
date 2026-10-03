import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Medicine } from "./medicine-catalog";
import { medicineCreateRepository } from "./medicine-repository";

const label = z.string().trim().min(1).max(64);
const note = z.string().trim().min(1).max(500);
const identitySchema = z.object({
  genericName: label, strength: label, dosageForm: label, brandName: label.optional(),
  infoEn: note.optional(), infoBn: note.optional(), infoHi: note.optional(),
  recordKind: z.enum(["FICTIONAL_DEMO", "PHYSICAL_PACK"]),
}).strict();
function pairedNotes(value: { infoEn?: string; infoBn?: string; infoHi?: string }) {
  return Boolean(value.infoEn) === Boolean(value.infoBn) && (!value.infoHi || Boolean(value.infoEn));
}
export const medicineCreateSchema = identitySchema.extend({ requestId: z.uuid() }).refine(pairedNotes, "English and Bengali notes must be supplied together");
const reviewSchema = z.object({
  labelReviewed: z.literal(true), languagesReviewed: z.literal(true),
  expected: identitySchema.refine(pairedNotes),
}).strict();
export type MedicineIdentity = z.infer<typeof identitySchema>;
export type StoredMedicine = MedicineIdentity & { id: string; requestId: string; createdBy: string; catalogStatus: Medicine["catalogStatus"]; reviewedAt?: string; reviewedBy?: string };
export type MedicineCreateRepository = {
  insert(record: StoredMedicine): Promise<StoredMedicine | null>;
  find(id: string): Promise<StoredMedicine | null>;
  review(id: string, expected: MedicineIdentity, actor: string): Promise<StoredMedicine | null>;
};
export class MedicineCreateError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND") { super(code); }
}
const identityKeys = ["genericName", "strength", "dosageForm", "brandName", "infoEn", "infoBn", "infoHi", "recordKind"] as const;
export function medicineDto(row: StoredMedicine): Medicine {
  const { id, genericName, strength, dosageForm, brandName, infoEn, infoBn, infoHi, recordKind, catalogStatus, reviewedAt } = row;
  return { id, genericName, strength, dosageForm, recordKind, catalogStatus,
    ...(brandName ? { brandName } : {}), ...(infoEn ? { infoEn } : {}), ...(infoBn ? { infoBn } : {}),
    ...(infoHi ? { infoHi } : {}), ...(reviewedAt ? { reviewedAt } : {}) };
}
export async function createMedicine(raw: unknown, actorUserId: string, repository: MedicineCreateRepository = medicineCreateRepository): Promise<Medicine & { created: boolean }> {
  const parsed = medicineCreateSchema.safeParse(raw);
  if (!parsed.success || !actorUserId) throw new MedicineCreateError("INVALID_INPUT");
  const record: StoredMedicine = { ...parsed.data, id: "custom_" + randomBytes(16).toString("base64url"), createdBy: actorUserId, catalogStatus: "PACK_CHECK_REQUIRED" };
  const saved = await repository.insert(record);
  if (!saved || saved.createdBy !== actorUserId || identityKeys.some(key => saved[key] !== record[key])) throw new MedicineCreateError("CONFLICT");
  return { ...medicineDto(saved), created: saved.id === record.id };
}
export async function reviewMedicine(id: string, raw: unknown, actorUserId: string, repository: MedicineCreateRepository = medicineCreateRepository): Promise<Medicine> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success || !actorUserId || !id || id.length > 64) throw new MedicineCreateError("INVALID_INPUT");
  const existing = await repository.find(id);
  if (!existing) throw new MedicineCreateError("NOT_FOUND");
  if (!existing.requestId || identityKeys.some(key => existing[key] !== parsed.data.expected[key])) throw new MedicineCreateError("CONFLICT");
  const saved = await repository.review(id, parsed.data.expected, actorUserId);
  if (!saved) throw new MedicineCreateError("CONFLICT");
  return medicineDto(saved);
}
