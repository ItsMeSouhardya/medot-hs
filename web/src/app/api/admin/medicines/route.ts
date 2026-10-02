import { getPharmacyAccess, pharmacyAccessDenied } from "@/lib/pharmacy-auth";
import { getSql } from "@/lib/db";

export async function GET() {
  const denied = pharmacyAccessDenied(await getPharmacyAccess());
  if (denied) return denied;
  try {
    const sql = getSql();
    const medicines = await sql`
      SELECT id, generic_name AS "genericName", strength,
             dosage_form AS "dosageForm", brand_name AS "brandName", catalog_status AS "catalogStatus"
      FROM medicines ORDER BY generic_name
    `;
    return Response.json(medicines, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response("Medicine catalog unavailable", { status: 503 });
  }
}
