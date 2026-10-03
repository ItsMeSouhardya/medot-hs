import { z } from "zod";
import catalog from "@/data/medicine-catalog.json";

export const medicineSchema = z.object({
  id: z.string().min(1).max(64),
  genericName: z.string().min(1),
  strength: z.string().min(1),
  dosageForm: z.string().min(1),
  brandName: z.string().min(1).optional(),
  catalogStatus: z.enum(["DEMO_READY", "PACK_CHECK_REQUIRED"]),
  recordKind: z.enum(["LEGACY", "FICTIONAL_DEMO", "PHYSICAL_PACK"]).default("LEGACY"),
  infoEn: z.string().min(1).max(500).optional(),
  infoBn: z.string().min(1).max(500).optional(),
  infoHi: z.string().min(1).max(500).optional(),
  reviewedAt: z.string().optional(),
});
export const medicineCatalogSchema = z.array(medicineSchema).refine(items => new Set(items.map(item => item.id)).size === items.length, "Catalog IDs must be unique");

export type Medicine = z.infer<typeof medicineCatalogSchema>[number];
export const medicineCatalog = medicineCatalogSchema.parse(catalog);
