import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAdminSession } from "../admin-auth";
import { getPharmacyAccess } from "../pharmacy-auth";
import { getSql } from "../db";
import { createPendingTag } from "../provision";
import { activateTag, revokeTag } from "../tag-lifecycle";
import { POST as createTag } from "../../app/api/admin/tags/route";
import { POST as activateTagRoute } from "../../app/api/admin/tags/[token]/activate/route";
import { POST as revokeTagRoute } from "../../app/api/admin/tags/[token]/revoke/route";
import { POST as oldLogin } from "../../app/api/admin/login/route";
import { GET as listMedicines } from "../../app/api/admin/medicines/route";
import { POST as addMedicine } from "../../app/api/admin/medicines/route";
import { POST as reviewMedicineRoute } from "../../app/api/admin/medicines/[id]/review/route";

vi.mock("@/lib/pharmacy-auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("../pharmacy-auth")>(), getPharmacyAccess: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getSql: vi.fn(() => vi.fn(async () => [])) }));
vi.mock("@/lib/tag-lifecycle", () => ({ activateTag: vi.fn(async () => false), revokeTag: vi.fn(async () => false) }));
vi.mock("@/lib/provision", async (importOriginal) => ({
  ...await importOriginal<typeof import("../provision")>(), createPendingTag: vi.fn(),
}));
const secret = "0123456789abcdef0123456789abcdef";
const token = "abcdefghijklmnopqrstuv";
const context = { params: Promise.resolve({ token }) };
function request(path: string, origin = "https://medot.example", cookie?: string, body = "{}") {
  return new Request("https://internal-host.example" + path, {
    method: "POST", headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie: "medot_admin=" + cookie } : {}) }, body,
  });
}
const mutationRoutes = [
  () => createTag(request("/api/admin/tags")),
  () => activateTagRoute(request("/api/admin/tags/" + token + "/activate"), context),
  () => revokeTagRoute(request("/api/admin/tags/" + token + "/revoke"), context),
  () => addMedicine(request("/api/admin/medicines")),
  () => reviewMedicineRoute(request("/api/admin/medicines/custom_fixture/review"), { params: Promise.resolve({ id: "custom_fixture" }) }),
];
it("custom catalog creation denies unauthenticated and foreign-origin requests before SQL", async () => {
  const invoke = (origin: string) => addMedicine(request("/api/admin/medicines", origin));
  expect((await invoke("https://medot.example")).status).toBe(401);
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  expect((await invoke("https://foreign.example")).status).toBe(403);
  expect(getSql).not.toHaveBeenCalled();
});
it("catalog review rejects a foreign origin before reading any row", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  const response = await reviewMedicineRoute(request("/review", "https://foreign.example"), { params: Promise.resolve({ id: "custom_fixture" }) });
  expect(response.status).toBe(403);
  expect(getSql).not.toHaveBeenCalled();
});
it.each(["not-json", "null", '{"catalogStatus":"DEMO_READY","createdBy":"forged"}'])("catalog writes reject malformed or forged data before SQL: %s", async body => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  const create = await addMedicine(request("/medicines", "https://medot.example", undefined, body));
  const review = await reviewMedicineRoute(request("/review", "https://medot.example", undefined, body), { params: Promise.resolve({ id: "custom_fixture" }) });
  for (const response of [create, review]) {
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
  expect(getSql).not.toHaveBeenCalled();
});
it("catalog database failure withholds private diagnostics", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  vi.mocked(getSql).mockImplementationOnce(() => { throw new Error("Private database credentials"); });
  const response = await addMedicine(request("/medicines", "https://medot.example", undefined, JSON.stringify({ requestId: "11111111-1111-4111-8111-111111111111", genericName: "Fictional label", strength: "Fixture", dosageForm: "Fixture", recordKind: "FICTIONAL_DEMO" })));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "UNAVAILABLE" });
});
beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "https://medot.example");
  vi.stubEnv("SESSION_SECRET", secret);
  vi.stubEnv("ADMIN_PASSWORD", "obsolete-test-password");
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "unauthenticated" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it.each(["unauthenticated", "forbidden"] as const)("denies %s at every protected resource before accessing data", async (kind) => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind });
  const expected = kind === "unauthenticated" ? 401 : 403;
  for (const invoke of mutationRoutes) {
    const response = await invoke();
    expect(response.status).toBe(expected);
    expect(await response.json()).toEqual({ error: kind === "forbidden" ? "FORBIDDEN" : "UNAUTHENTICATED" });
  }
  expect((await listMedicines()).status).toBe(expected);
  expect(getSql).not.toHaveBeenCalled();
  expect(createPendingTag).not.toHaveBeenCalled();
  expect(activateTag).not.toHaveBeenCalled();
  expect(revokeTag).not.toHaveBeenCalled();
});
it("an old signed password cookie cannot bypass Clerk", async () => {
  const cookie = createAdminSession(secret);
  expect((await createTag(request("/api/admin/tags", "https://medot.example", cookie))).status).toBe(401);
  expect((await activateTagRoute(request("/api/admin/tags/" + token + "/activate", "https://medot.example", cookie), context)).status).toBe(401);
  expect((await revokeTagRoute(request("/api/admin/tags/" + token + "/revoke", "https://medot.example", cookie), context)).status).toBe(401);
  const catalog = await listMedicines();
  expect(catalog.status).toBe(401);
  expect(getSql).not.toHaveBeenCalled();
});
it("denies a foreign origin even for an allowed Clerk user", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  expect((await createTag(request("/api/admin/tags", "https://foreign.example"))).status).toBe(403);
  expect((await activateTagRoute(request("/api/admin/tags/" + token + "/activate", "https://foreign.example"), context)).status).toBe(403);
  expect((await revokeTagRoute(request("/api/admin/tags/" + token + "/revoke", "https://foreign.example"), context)).status).toBe(403);
  expect(createPendingTag).not.toHaveBeenCalled();
  expect(activateTag).not.toHaveBeenCalled();
  expect(revokeTag).not.toHaveBeenCalled();
});
it("allows the verified pharmacy user to reach catalog and lifecycle services", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  expect((await listMedicines()).status).toBe(200);
  expect((await activateTagRoute(request("/api/admin/tags/" + token + "/activate", "https://medot.example", undefined, '{"verified":true}'), context)).status).toBe(409);
  expect((await revokeTagRoute(request("/api/admin/tags/" + token + "/revoke"), context)).status).toBe(409);
  expect(getSql).toHaveBeenCalledOnce();
  expect(activateTag).toHaveBeenCalledWith(token, expect.anything());
  expect(revokeTag).toHaveBeenCalledWith(token, expect.anything());
});
it.each(['{}', '{"verified":false}', '{"verified":"true"}', 'null', 'not-json'])("rejects activation without explicit readback confirmation: %s", async (body) => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  const response = await activateTagRoute(request("/api/admin/tags/" + token + "/activate", "https://medot.example", undefined, body), context);
  expect(response.status).toBe(400);
  expect(activateTag).not.toHaveBeenCalled();
});
it("activates only the verified pending token and returns a conflict on a race", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  vi.mocked(activateTag).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  const invoke = () => activateTagRoute(request("/api/admin/tags/" + token + "/activate", "https://medot.example", undefined, '{"verified":true}'), context);
  expect((await invoke()).status).toBe(200);
  expect((await invoke()).status).toBe(409);
});
it("authorized provisioning retains the exact canonical token URL", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  const input = { medicineId: "paracetamol-500", batchNumber: "DEMO-FIXTURE", expiryMonth: "2028-12", instruction: "Demo only. No treatment instruction.", instructionBn: "শুধুমাত্র ডেমো। চিকিৎসার নির্দেশনা নয়।", createdBy: "client-forgery" };
  const result = { token, url: "https://medot.example/m/" + token };
  vi.mocked(createPendingTag).mockResolvedValue(result);
  const response = await createTag(request("/api/admin/tags", "https://medot.example", undefined, JSON.stringify(input)));
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual(result);
  expect(createPendingTag).toHaveBeenCalledWith(input, expect.anything(), "https://medot.example", "user_team_one");
});
it("disables obsolete password login even with correct old credentials", async () => {
  const response = await oldLogin();
  expect(response.status).toBe(410);
  expect(response.headers.get("set-cookie")).toBeNull();
});
