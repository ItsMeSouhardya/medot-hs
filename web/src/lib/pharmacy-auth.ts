import { auth } from "@clerk/nextjs/server";

export type PharmacyAccess =
  | { kind: "authorized"; userId: string }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" };

export async function getPharmacyAccess(): Promise<PharmacyAccess> {
  if (!isPharmacyAuthConfigured()) return { kind: "unauthenticated" };
  try {
    const { userId } = await auth();
    if (!userId) return { kind: "unauthenticated" };
    const allowed = (process.env.PHARMACY_ALLOWED_USER_IDS ?? "")
      .split(",").map((id) => id.trim()).filter(Boolean);
    return allowed.includes(userId)
      ? { kind: "authorized", userId }
      : { kind: "forbidden" };
  } catch {
    // Provider/middleware failures cannot grant pharmacy access.
    return { kind: "unauthenticated" };
  }
}
export function isPharmacyAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim());
}

export function pharmacyAccessDenied(access: PharmacyAccess): Response | null {
  if (access.kind === "authorized") return null;
  return Response.json({ error: access.kind === "forbidden" ? "FORBIDDEN" : "UNAUTHENTICATED" }, {
    status: access.kind === "forbidden" ? 403 : 401,
    headers: { "Cache-Control": "no-store" },
  });
}
