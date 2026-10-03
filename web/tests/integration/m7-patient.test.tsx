import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveTag, type TagLookup } from "@/lib/tag-repository";
import PatientPage from "@/app/m/[token]/page";
import { GET } from "@/app/api/public/tags/[token]/route";

vi.mock("@/lib/tag-repository", () => ({ resolveTag: vi.fn() }));
const token = "abcdefghijklmnopqrstuv";
const record = { token, genericName: "Software fixture label", strength: "Fixture strength", dosageForm: "Fixture form", batchNumber: "M7-FIXTURE", expiryMonth: "2099-12", instruction: "Software fixture only. No treatment instruction.", instructionBn: "শুধুমাত্র সফটওয়্যার ডেমো।" };
const request = () => GET(new Request(`https://medot.example/api/public/tags/${token}`), { params: Promise.resolve({ token }) });
const page = async () => renderToStaticMarkup(await PatientPage({ params: Promise.resolve({ token }) }));
beforeEach(() => vi.mocked(resolveTag).mockResolvedValue({ kind: "active", record }));
afterEach(() => vi.resetAllMocks());

// Opt-in static exports for the local browser smoke. These use the actual page
// renderer with a resolver fixture, never a production bypass or database write.
afterAll(async () => {
  if (process.env.MEDOT_EXPORT_M7_FIXTURES !== "1") return;
  const destination = resolve(process.cwd(), "../.superpowers/sdd/2026-10-01-medot-hs/m7-fixtures");
  await mkdir(destination, { recursive: true });
  for (const state of ["current", "expired", "unknown", "pending", "revoked", "unavailable"] as const) {
    if (state === "unavailable") vi.mocked(resolveTag).mockRejectedValue(new Error("Software fixture"));
    else vi.mocked(resolveTag).mockResolvedValue(state === "current" || state === "expired"
      ? { kind: "active", record: { ...record, expiryMonth: state === "expired" ? "2000-01" : record.expiryMonth } }
      : { kind: state });
    const html = await page();
    await writeFile(resolve(destination, state + ".html"), `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>M7 ${state} software fixture</title><link rel="stylesheet" href="/globals.css"><style>@font-face{font-family:FixtureManrope;src:url('/fonts/manrope.ttf')}body{--font-heading:FixtureManrope}.fixture-label{font:14px sans-serif;padding:12px;background:#ddede5;color:#172f2b}</style></head><body><p class="fixture-label">M7 SOFTWARE FIXTURE: ${state}. Static page rendering only; speech buttons are inert. No real medicine or physical activation.</p>${html}</body></html>`);
  }
});

it("fresh public lookup returns only the resolver's active record with no-store headers", async () => {
  const r = await request();
  expect(r.status).toBe(200); expect(r.headers.get("cache-control")).toContain("no-store");
  expect(await r.json()).toEqual({ kind: "active", record, expiryState: "CURRENT" });
  expect(resolveTag).toHaveBeenCalledWith(token);
});
it.each([['unknown', 404], ['pending', 409], ['revoked', 410]] as const)("%s response hides all identity fields", async (kind, status) => {
  vi.mocked(resolveTag).mockResolvedValue({ kind });
  const r = await request();
  expect(r.status).toBe(status); expect(await r.json()).toEqual({ kind });
  expect(r.headers.get("cache-control")).toContain("no-store");
  const html = await page();
  expect(html).not.toContain(record.genericName); expect(html).not.toContain(record.instruction);
  expect(html).not.toContain("Read medicine aloud");
});
it("database failure returns a safe uncached response and a page without identity or audio", async () => {
  vi.mocked(resolveTag).mockRejectedValue(new Error("Private connection diagnostic"));
  const r = await request();
  expect(r.status).toBe(503); expect(await r.json()).toEqual({ kind: "unavailable" });
  expect(r.headers.get("cache-control")).toContain("no-store");
  const html = await page();
  expect(html).toContain("Medicine information unavailable");
  expect(html).not.toContain("Private connection diagnostic"); expect(html).not.toContain(record.genericName);
  expect(html).not.toContain("Read medicine aloud");
});
it("expired page places the warning before identity and speech controls", async () => {
  vi.mocked(resolveTag).mockResolvedValue({ kind: "active", record: { ...record, expiryMonth: "2000-01" } });
  const html = await page();
  expect(html.indexOf("Labelled expiry has passed")).toBeLessThan(html.indexOf(record.genericName));
  expect(html.indexOf("Labelled expiry has passed")).toBeLessThan(html.indexOf("Read medicine aloud"));
  expect((await (await request()).json()).expiryState).toBe("EXPIRED");
});
it("current page retains exact stored identity/instruction without patient sign-in", async () => {
  const html = await page();
  expect(html).toContain(record.genericName); expect(html).toContain(record.instruction);
  expect(html).toContain("Read medicine aloud"); expect(html).not.toContain("Sign in");
});
it("repeated twin rendering shows exact notes and actual pairing dates without adding access events", async () => {
  const twin = { ...record, medicineId: "custom_fixture", recordKind: "FICTIONAL_DEMO" as const, usageSlots: ["EVENING" as const], infoEn: "Fictional label notes.", infoBn: "শুধুমাত্র ডেমো।", createdAt: "2026-10-02T10:00:00.000Z", activatedAt: "2026-10-02T10:05:00.000Z", verifiedAt: "2026-10-02T10:05:00.000Z", verificationVersion: 1 };
  vi.mocked(resolveTag).mockResolvedValue({ kind: "active", record: twin });
  const first = await page();
  expect(first).toContain(twin.infoEn); expect(first).toContain(twin.infoBn);
  expect(first).toContain('lang="bn"'); expect(first).toContain(twin.verifiedAt);
  expect(first).toContain("Evening");
  expect(first.indexOf("Read medicine aloud")).toBeLessThan(first.indexOf("Medicine twin"));
  await request(); await request();
  expect(await page()).toBe(first);
  expect(first).not.toContain("First accessed"); expect(first).not.toContain("Dispensed");
});
it("a second request sees revocation rather than reusing an earlier active result", async () => {
  expect((await request()).status).toBe(200);
  vi.mocked(resolveTag).mockResolvedValue({ kind: "revoked" } as TagLookup);
  expect((await request()).status).toBe(410);
});
