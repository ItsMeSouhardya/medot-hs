import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";

import { listMedicines } from "@/lib/medicine-repository";
import ProvisionForm, { type MedicineOption } from "@/components/provision-form";

export const dynamic = "force-dynamic";

export default async function NewTagPage() {
  const access = await getPharmacyAccess();
  if (access.kind !== "authorized") return pharmacyPageDenied(access);

  let medicines: MedicineOption[];
  try {
    medicines = await listMedicines();
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
      <header className="operator-heading"><div><p className="eyebrow">Prepare a new record</p><h1>Provision a MEDOT tag</h1><p>One sample strip, one clip. Review the printed details before writing.</p></div></header>
      <ProvisionForm medicines={medicines} />
    </main>
  );
}
