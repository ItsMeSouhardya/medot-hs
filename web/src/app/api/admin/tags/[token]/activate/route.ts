import { getPharmacyAccess, pharmacyAccessDenied } from "@/lib/pharmacy-auth";
import { hasSameOrigin } from "@/lib/request-origin";
import { activateTag } from "@/lib/tag-lifecycle";
import { lifecycleRepository } from "@/lib/tag-repository";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Context) {
  const denied = pharmacyAccessDenied(await getPharmacyAccess());
  if (denied) return denied;
  if (!hasSameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("verified" in body) || body.verified !== true) {
      return Response.json({ error: "READBACK_REQUIRED" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "READBACK_REQUIRED" }, { status: 400 });
  }
  const { token } = await params;
  try {
    const changed = await activateTag(token, lifecycleRepository);
    if (!changed) return new Response("Tag is not pending", { status: 409 });
    return Response.json({ status: "ACTIVE" });
  } catch {
    return new Response("Activation unavailable", { status: 503 });
  }
}
