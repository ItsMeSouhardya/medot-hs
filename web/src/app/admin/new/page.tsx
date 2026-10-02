import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookieName, verifyAdminSession } from "@/lib/admin-auth";
import { getSql } from "@/lib/db";
import ProvisionForm, { type MedicineOption } from "@/components/provision-form";

export const dynamic = "force-dynamic";

export default async function NewTagPage() {
  const token = (await cookies()).get(adminCookieName)?.value ?? "";
  if (!verifyAdminSession(token, process.env.SESSION_SECRET ?? "")) {
    redirect("/admin");
  }

  let medicines: MedicineOption[];
  try {
    const sql = getSql();
    medicines = await sql`
      SELECT id, generic_name AS "genericName", strength,
             dosage_form AS "dosageForm"
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
