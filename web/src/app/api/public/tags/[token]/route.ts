import { resolveTag } from "@/lib/tag-repository";
import { expiryState } from "@/lib/domain";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const lookup = await resolveTag(token);
    if (lookup.kind === "active") {
      return Response.json({ ...lookup, expiryState: expiryState(lookup.record.expiryMonth) }, { headers });
    }
    const status = { unknown: 404, pending: 409, revoked: 410 }[lookup.kind];
    return Response.json({ kind: lookup.kind }, { status, headers });
  } catch {
    return Response.json({ kind: "unavailable" }, { status: 503, headers });
  }
}
