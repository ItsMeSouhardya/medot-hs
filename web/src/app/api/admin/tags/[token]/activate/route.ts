import { hasSameOrigin, requireAdmin } from "@/lib/admin-auth";
import { activateTag } from "@/lib/tag-lifecycle";
import { lifecycleRepository } from "@/lib/tag-repository";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Context) {
  if (!requireAdmin(request)) return new Response("Unauthorized", { status: 401 });
  if (!hasSameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const { token } = await params;
  try {
    const changed = await activateTag(token, lifecycleRepository);
    if (!changed) return new Response("Tag is not pending", { status: 409 });
    return Response.json({ status: "ACTIVE" });
  } catch {
    return new Response("Activation unavailable", { status: 503 });
  }
}
