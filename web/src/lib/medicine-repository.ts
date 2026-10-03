import { getSql } from "./db";
import type { Medicine } from "./medicine-catalog";
import type { MedicineCreateRepository, StoredMedicine } from "./medicine-create";

type MedicineRow = { id: string; generic_name: string; strength: string; dosage_form: string; brand_name?: string | null; catalog_status: Medicine["catalogStatus"]; record_kind?: Medicine["recordKind"]; info_en?: string | null; info_bn?: string | null; info_hi?: string | null; created_by?: string; creation_request_id?: string; readiness_reviewed_at?: string | Date | null; readiness_reviewed_by?: string };
function mapMedicine(row: MedicineRow): Medicine {
  return { id: row.id, genericName: row.generic_name, strength: row.strength, dosageForm: row.dosage_form,
    catalogStatus: row.catalog_status, recordKind: row.record_kind ?? "LEGACY",
    ...(row.brand_name ? { brandName: row.brand_name } : {}), ...(row.info_en ? { infoEn: row.info_en } : {}),
    ...(row.info_bn ? { infoBn: row.info_bn } : {}), ...(row.info_hi ? { infoHi: row.info_hi } : {}),
    ...(row.readiness_reviewed_at ? { reviewedAt: new Date(row.readiness_reviewed_at).toISOString() } : {}) };
}
function mapStored(row: MedicineRow): StoredMedicine {
  return { ...mapMedicine(row), recordKind: row.record_kind as StoredMedicine["recordKind"], createdBy: row.created_by ?? "", requestId: row.creation_request_id ?? "", reviewedBy: row.readiness_reviewed_by };
}
export async function listMedicines(): Promise<Medicine[]> {
  const sql = getSql();
  const rows = await sql`SELECT id, generic_name, strength, dosage_form, brand_name, catalog_status,
    record_kind, info_en, info_bn, info_hi, readiness_reviewed_at FROM medicines ORDER BY generic_name, strength, id`;
  return (rows as MedicineRow[]).map(mapMedicine);
}
export const medicineCreateRepository: MedicineCreateRepository = {
  async insert(record) {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO medicines (id, generic_name, strength, dosage_form, brand_name, info_en, info_bn, info_hi,
        record_kind, catalog_status, created_by, creation_request_id)
      VALUES (${record.id}, ${record.genericName}, ${record.strength}, ${record.dosageForm}, ${record.brandName ?? null},
        ${record.infoEn ?? null}, ${record.infoBn ?? null}, ${record.infoHi ?? null}, ${record.recordKind},
        'PACK_CHECK_REQUIRED', ${record.createdBy}, ${record.requestId})
      ON CONFLICT (creation_request_id) DO UPDATE SET creation_request_id = medicines.creation_request_id
      WHERE medicines.created_by = EXCLUDED.created_by
        AND medicines.generic_name = EXCLUDED.generic_name AND medicines.strength = EXCLUDED.strength
        AND medicines.dosage_form = EXCLUDED.dosage_form AND medicines.record_kind = EXCLUDED.record_kind
        AND medicines.brand_name IS NOT DISTINCT FROM EXCLUDED.brand_name
        AND medicines.info_en IS NOT DISTINCT FROM EXCLUDED.info_en AND medicines.info_bn IS NOT DISTINCT FROM EXCLUDED.info_bn
        AND medicines.info_hi IS NOT DISTINCT FROM EXCLUDED.info_hi
      RETURNING *`;
    return rows[0] ? mapStored(rows[0] as MedicineRow) : null;
  },
  async find(id) {
    const sql = getSql();
    const rows = await sql`SELECT * FROM medicines WHERE id = ${id} LIMIT 1`;
    return rows[0] ? mapStored(rows[0] as MedicineRow) : null;
  },
  async review(id, expected, actor) {
    const sql = getSql();
    const rows = await sql`UPDATE medicines SET catalog_status = 'DEMO_READY',
      readiness_reviewed_at = COALESCE(readiness_reviewed_at, now()),
      readiness_reviewed_by = COALESCE(readiness_reviewed_by, ${actor})
      WHERE id = ${id} AND creation_request_id IS NOT NULL
        AND generic_name = ${expected.genericName} AND strength = ${expected.strength}
        AND dosage_form = ${expected.dosageForm} AND record_kind = ${expected.recordKind}
        AND brand_name IS NOT DISTINCT FROM ${expected.brandName ?? null}
        AND info_en IS NOT DISTINCT FROM ${expected.infoEn ?? null} AND info_bn IS NOT DISTINCT FROM ${expected.infoBn ?? null}
        AND info_hi IS NOT DISTINCT FROM ${expected.infoHi ?? null}
      RETURNING *`;
    return rows[0] ? mapStored(rows[0] as MedicineRow) : null;
  },
};
