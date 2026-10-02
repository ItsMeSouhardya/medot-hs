import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getPharmacyAccess } from "../pharmacy-auth";
import { getSql } from "../db";
import { listOperatorTags, findOperatorTag, getOperatorCounts, parseTagReference } from "../operator-tags";
import PharmacyPage from "../../app/(operator)/pharmacy/page";
import ProvisionPage from "../../app/(operator)/pharmacy/provision/page";
import TagsPage from "../../app/(operator)/pharmacy/tags/page";

vi.mock("@/lib/pharmacy-auth", () => ({ getPharmacyAccess: vi.fn(), isPharmacyAuthConfigured: () => true }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("SIGN_IN_REDIRECT"); }) }));
vi.mock("@/lib/db", () => ({ getSql: vi.fn(() => vi.fn(async () => [])) }));
vi.mock("@/lib/operator-tags", () => ({ listOperatorTags: vi.fn(async () => []), findOperatorTag: vi.fn(), parseTagReference: vi.fn(), getOperatorCounts: vi.fn(async () => ({ pending: 4, active: 8, revoked: 2 })) }));
vi.mock("@clerk/nextjs", () => ({ SignOutButton: () => null }));
const pages = [() => PharmacyPage(), () => ProvisionPage(), () => TagsPage({ searchParams: Promise.resolve({}) })];
beforeEach(() => vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "unauthenticated" }));
afterEach(() => vi.clearAllMocks());
it("every pharmacy page checks sign-in before loading records", async () => {
  for (const page of pages) await expect(page()).rejects.toThrow("SIGN_IN_REDIRECT");
  expect(getPharmacyAccess).toHaveBeenCalledTimes(3);
  expect(getSql).not.toHaveBeenCalled();
  expect(listOperatorTags).not.toHaveBeenCalled();
  expect(findOperatorTag).not.toHaveBeenCalled();
  expect(getOperatorCounts).not.toHaveBeenCalled();
});
it("a signed-in outsider cannot load any pharmacy page data", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "forbidden" });
  for (const page of pages) expect(renderToStaticMarkup(await page())).toContain("Pharmacy access required");
  expect(getPharmacyAccess).toHaveBeenCalledTimes(3);
  expect(getSql).not.toHaveBeenCalled();
  expect(listOperatorTags).not.toHaveBeenCalled();
  expect(findOperatorTag).not.toHaveBeenCalled();
});
it("allows a verified teammate to load the existing pharmacy services", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  for (const page of pages) expect(await page()).toBeTruthy();
  expect(getSql).toHaveBeenCalledOnce();
  expect(listOperatorTags).toHaveBeenCalledTimes(2);
});
it("shows actual database totals and refuses to show invented zero counts when unavailable", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  const html = renderToStaticMarkup(await PharmacyPage());
  expect(getOperatorCounts).toHaveBeenCalledOnce();
  expect(html).toContain('>4<'); expect(html).toContain('>8<'); expect(html).toContain('>2<');
  vi.mocked(getOperatorCounts).mockRejectedValueOnce(new Error("Offline"));
  expect(renderToStaticMarkup(await PharmacyPage())).toContain("Overview unavailable");
});
it("recovers by exact canonical URL and shows saved variants for a pending record", async () => {
  vi.mocked(getPharmacyAccess).mockResolvedValue({ kind: "authorized", userId: "user_team_one" });
  const token = "abcdefghijklmnopqrstuv"; const url = "https://medot.example/m/" + token;
  vi.stubEnv("APP_ORIGIN", "https://medot.example");
  vi.mocked(parseTagReference).mockReturnValue(token);
  vi.mocked(findOperatorTag).mockResolvedValue({ token, url, genericName: "Paracetamol", strength: "500 mg", dosageForm: "Tablet", status: "PENDING", batchNumber: "SOFTWARE-FIXTURE", expiryMonth: "2028-12", instruction: "Software demo only.", instructionBn: "সফটওয়্যার ডেমো।", activationReady: true });
  const html = renderToStaticMarkup(await TagsPage({ searchParams: Promise.resolve({ tag: url }) }));
  expect(parseTagReference).toHaveBeenCalledWith(url, "https://medot.example");
  expect(findOperatorTag).toHaveBeenCalledWith(token, "https://medot.example");
  expect(html).toContain("সফটওয়্যার ডেমো।");
  expect(html).toContain("Activate verified tag");
  vi.unstubAllEnvs();
});
