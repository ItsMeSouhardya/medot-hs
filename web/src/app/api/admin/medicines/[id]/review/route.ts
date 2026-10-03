import { getPharmacyAccess, pharmacyAccessDenied } from "@/lib/pharmacy-auth";
import { hasSameOrigin } from "@/lib/request-origin";
import { reviewMedicine, MedicineCreateError } from "@/lib/medicine-create";

const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getPharmacyAccess();
  const denied = pharmacyAccessDenied(access);
  if (denied) return denied;
  if (!hasSameOrigin(request)) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers }); }
  try {
    const { id } = await params;
    return Response.json(await reviewMedicine(id, body, access.kind === "authorized" ? access.userId : ""), { headers });
  } catch (error) {
    if (error instanceof MedicineCreateError) return Response.json({ error: error.code }, { status: error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : 409, headers });
    return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}
