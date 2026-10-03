import { getPharmacyAccess, pharmacyAccessDenied } from "@/lib/pharmacy-auth";
import { listMedicines } from "@/lib/medicine-repository";
import { createMedicine, MedicineCreateError } from "@/lib/medicine-create";
import { hasSameOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  const denied = pharmacyAccessDenied(await getPharmacyAccess());
  if (denied) return denied;
  try {
    return Response.json(await listMedicines(), { headers });
  } catch {
    return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  const access = await getPharmacyAccess();
  const denied = pharmacyAccessDenied(access);
  if (denied) return denied;
  if (!hasSameOrigin(request)) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers }); }
  try {
    const { created, ...medicine } = await createMedicine(body, access.kind === "authorized" ? access.userId : "");
    return Response.json(medicine, { status: created ? 201 : 200, headers });
  } catch (error) {
    if (error instanceof MedicineCreateError) return Response.json({ error: error.code }, { status: error.code === "INVALID_INPUT" ? 400 : 409, headers });
    return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}
