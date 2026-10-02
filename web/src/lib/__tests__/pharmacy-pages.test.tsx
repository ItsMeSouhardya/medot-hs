import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getPharmacyAccess } from "../pharmacy-auth";
import { getSql } from "../db";
import { listOperatorTags, findOperatorTag } from "../operator-tags";
import PharmacyPage from "../../app/(operator)/pharmacy/page";
import ProvisionPage from "../../app/(operator)/pharmacy/provision/page";
import TagsPage from "../../app/(operator)/pharmacy/tags/page";

vi.mock("@/lib/pharmacy-auth", () => ({ getPharmacyAccess: vi.fn(), isPharmacyAuthConfigured: () => true }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("SIGN_IN_REDIRECT"); }) }));
vi.mock("@/lib/db", () => ({ getSql: vi.fn(() => vi.fn(async () => [])) }));
vi.mock("@/lib/operator-tags", () => ({ listOperatorTags: vi.fn(async () => []), findOperatorTag: vi.fn(), parseTagReference: vi.fn() }));
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
  expect(listOperatorTags).toHaveBeenCalledOnce();
});
