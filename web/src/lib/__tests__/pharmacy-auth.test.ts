import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { getPharmacyAccess } from "../pharmacy-auth";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_fixture");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("PHARMACY_ALLOWED_USER_IDS", "user_team_one, user_team_two");
  vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
function verified(userId: string) {
  vi.mocked(auth).mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
}
it("denies requests without a verified session", async () => {
  expect(await getPharmacyAccess()).toEqual({ kind: "unauthenticated" });
});
it("denies a verified user outside the allowlist", async () => {
  verified("user_outsider");
  expect(await getPharmacyAccess()).toEqual({ kind: "forbidden" });
});
it("an empty allowlist denies even a verified user", async () => {
  vi.stubEnv("PHARMACY_ALLOWED_USER_IDS", " , ");
  verified("user_team_one");
  expect(await getPharmacyAccess()).toEqual({ kind: "forbidden" });
});
it("allows an exact verified user ID and preserves its identity", async () => {
  verified("user_team_two");
  expect(await getPharmacyAccess()).toEqual({ kind: "authorized", userId: "user_team_two" });
});
it("does not accept a partial user ID match", async () => {
  verified("user_team");
  expect(await getPharmacyAccess()).toEqual({ kind: "forbidden" });
});
it("fails closed when Clerk cannot verify a session", async () => {
  vi.mocked(auth).mockRejectedValue(new Error("Provider unavailable"));
  expect(await getPharmacyAccess()).toEqual({ kind: "unauthenticated" });
});
it("does not use Clerk keyless setup when keys are missing", async () => {
  vi.stubEnv("CLERK_SECRET_KEY", "");
  expect(await getPharmacyAccess()).toEqual({ kind: "unauthenticated" });
  expect(auth).not.toHaveBeenCalled();
});
