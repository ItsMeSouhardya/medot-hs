import { getPharmacyAccess, pharmacyAccessDenied } from "@/lib/pharmacy-auth";
import { hasSameOrigin } from "@/lib/request-origin";
import { revokeTag } from "@/lib/tag-lifecycle";
import { lifecycleRepository } from "@/lib/tag-repository";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Context) {
  const denied = pharmacyAccessDenied(await getPharmacyAccess());
  if (denied) return denied;
  if (!hasSameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const { token } = await params;
  try {
    const changed = await revokeTag(token, lifecycleRepository);
    if (!changed) return new Response("Tag is already revoked or missing", { status: 409 });
    return Response.json({ status: "REVOKED" });
  } catch {
    return new Response("Revocation unavailable", { status: 503 });
  }
}
