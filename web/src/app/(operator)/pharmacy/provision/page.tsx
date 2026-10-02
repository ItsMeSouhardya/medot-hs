import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";

import { getSql } from "@/lib/db";
import ProvisionForm, { type MedicineOption } from "@/components/provision-form";

export const dynamic = "force-dynamic";

export default async function NewTagPage() {
  const access = await getPharmacyAccess();
  if (access.kind !== "authorized") return pharmacyPageDenied(access);

  let medicines: MedicineOption[];
  try {
    const sql = getSql();
    medicines = await sql`
      SELECT id, generic_name AS "genericName", strength,
             dosage_form AS "dosageForm", brand_name AS "brandName", catalog_status AS "catalogStatus"
      FROM medicines ORDER BY generic_name
    ` as MedicineOption[];
  } catch {
    return (
      <main className="operator-page">
        <h1>Medicine catalog unavailable</h1>
        <p>Check the demo database connection before provisioning a tag.</p>
      </main>
    );
  }

  return (
    <main className="operator-page">
      <h1>Provision a MEDOT tag</h1>
      <p>For controlled prototype testing with sample strips only.</p>
      <ProvisionForm medicines={medicines} />
    </main>
  );
}
