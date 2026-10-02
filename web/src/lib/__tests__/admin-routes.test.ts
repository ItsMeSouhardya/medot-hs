import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAdminSession } from "../admin-auth";
import { POST as createTag } from "../../app/api/admin/tags/route";
import { POST as activateTagRoute } from "../../app/api/admin/tags/[token]/activate/route";
import { POST as revokeTagRoute } from "../../app/api/admin/tags/[token]/revoke/route";
import { GET as listMedicines } from "../../app/api/admin/medicines/route";

vi.mock("@/lib/tag-lifecycle", () => ({
  activateTag: vi.fn(async () => false),
  revokeTag: vi.fn(async () => false),
}));

const secret = "0123456789abcdef0123456789abcdef";
const token = "abcdefghijklmnopqrstuv";
const context = { params: Promise.resolve({ token }) };

function request(path: string, cookie?: string, origin = "https://medot.example") {
  return new Request("https://medot.example" + path, {
    method: "POST",
    headers: {
      origin,
      ...(cookie ? { cookie: "medot_admin=" + cookie } : {}),
    },
  });
}

beforeEach(() => vi.stubEnv("SESSION_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());

it("does not let an unsigned session create, activate, revoke, or list catalog", async () => {
  expect((await createTag(request("/api/admin/tags"))).status).toBe(401);
  expect((await activateTagRoute(request("/api/admin/tags/" + token + "/activate"), context)).status).toBe(401);
  expect((await revokeTagRoute(request("/api/admin/tags/" + token + "/revoke"), context)).status).toBe(401);
  const catalog = new Request("https://medot.example/api/admin/medicines");
  expect((await listMedicines(catalog)).status).toBe(401);
});

it("does not let a foreign origin mutate with a valid cookie", async () => {
  const cookie = createAdminSession(secret);
  expect((await createTag(request("/api/admin/tags", cookie, "https://foreign.example"))).status).toBe(403);
  expect((await activateTagRoute(request("/api/admin/tags/" + token + "/activate", cookie, "https://foreign.example"), context)).status).toBe(403);
  expect((await revokeTagRoute(request("/api/admin/tags/" + token + "/revoke", cookie, "https://foreign.example"), context)).status).toBe(403);
});

it("returns a conflict when a tag cannot transition", async () => {
  const cookie = createAdminSession(secret);
  expect((await activateTagRoute(request("/api/admin/tags/" + token + "/activate", cookie), context)).status).toBe(409);
  expect((await revokeTagRoute(request("/api/admin/tags/" + token + "/revoke", cookie), context)).status).toBe(409);
});
