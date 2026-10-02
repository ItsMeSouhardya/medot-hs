import { requireAdmin } from "@/lib/admin-auth";
import { getSql } from "@/lib/db";

export async function GET(request: Request) {
  if (!requireAdmin(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const sql = getSql();
    const medicines = await sql`
      SELECT id, generic_name AS "genericName", strength,
             dosage_form AS "dosageForm"
      FROM medicines ORDER BY generic_name
    `;
    return Response.json(medicines);
  } catch {
    return new Response("Medicine catalog unavailable", { status: 503 });
  }
}
