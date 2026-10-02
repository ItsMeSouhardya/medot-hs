import { z } from "zod";
import catalog from "@/data/medicine-catalog.json";

export const medicineCatalogSchema = z.array(z.object({
  id: z.string().min(1).max(64),
  genericName: z.string().min(1),
  strength: z.string().min(1),
  dosageForm: z.string().min(1),
  brandName: z.string().min(1).optional(),
  catalogStatus: z.enum(["DEMO_READY", "PACK_CHECK_REQUIRED"]),
})).refine(items => new Set(items.map(item => item.id)).size === items.length, "Catalog IDs must be unique");

export type Medicine = z.infer<typeof medicineCatalogSchema>[number];
export const medicineCatalog = medicineCatalogSchema.parse(catalog);
