import { getPharmacyAccess, pharmacyAccessDenied } from "@/lib/pharmacy-auth";
import { hasSameOrigin } from "@/lib/request-origin";
import { createPendingTag, ProvisionError } from "@/lib/provision";
import { provisionRepository } from "@/lib/tag-repository";

export async function POST(request: Request) {
  const denied = pharmacyAccessDenied(await getPharmacyAccess());
  if (denied) return denied;
  if (!hasSameOrigin(request)) return new Response("Invalid origin", { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  try {
    const result = await createPendingTag(
      body,
      provisionRepository,
      process.env.APP_ORIGIN ?? "",
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ProvisionError) {
      return Response.json({ error: error.code }, { status: 400 });
    }
    return new Response("Provisioning unavailable", { status: 503 });
  }
}
