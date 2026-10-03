// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PatientView from "../patient/patient-view";
const token = "abcdefghijklmnopqrstuv";
const record = { token, genericName: "Fictional fresh label", strength: "Fixture strength", dosageForm: "Fixture form", batchNumber: "SOFTWARE", expiryMonth: "2099-12", instruction: "Exact English fixture.", instructionBn: "শুধুমাত্র ডেমো।" };
const active = { kind: "active" as const, record };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async (url:string) => url.startsWith("/api/sharing/")?response({error:"DENIED"},403):response({ ...active, expiryState: "CURRENT" }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("localizes patient details without translating the stored instruction when speech is unavailable", async () => {
  const synthesize = vi.fn(); vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), speak: synthesize });
  render(<PatientView token={token} initialLookup={active} initialLanguage="en" />);
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.filter(call=>String(call[0]).startsWith("/api/public/"))).toHaveLength(1));
  fireEvent.change(screen.getByLabelText("Language"), { target: { value: "bn" } });
  expect(screen.getByText(record.instructionBn)).toBeTruthy();
  expect(screen.getByRole("main").getAttribute("lang")).toBe("bn");
  expect(synthesize).not.toHaveBeenCalled();
});
it.each(["revoked", "pending", "unavailable"])("foreground validation clears old identity and audio for %s", async kind => {
  render(<PatientView token={token} initialLookup={active} initialLanguage="en" />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Read medicine aloud" }).hasAttribute("disabled")).toBe(false));
  vi.mocked(fetch).mockImplementation(async url=>String(url).startsWith("/api/sharing/")?response({error:"DENIED"},403):response({ kind }, kind === "revoked" ? 410 : kind === "pending" ? 409 : 503));
  fireEvent(window, new Event("focus"));
  await waitFor(() => {expect(screen.queryByText(record.genericName)).toBeNull();expect(screen.queryByRole("button", { name: "Read medicine aloud" })).toBeNull();});
});
it("legacy Bengali selection marks English text and speech fallback explicitly", async () => {
  render(<PatientView token={token} initialLookup={{ ...active, record: { ...record, instructionBn: undefined } }} initialLanguage="bn" />);
  expect(screen.getByText(record.instruction).closest("dd")?.getAttribute("lang")).toBe("en");
  expect(screen.getByText(/ইংরেজি/)).toBeTruthy();
});
