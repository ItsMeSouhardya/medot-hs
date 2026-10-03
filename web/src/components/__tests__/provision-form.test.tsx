// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act, within } from "@testing-library/react";
import ProvisionForm from "../provision-form";
import { DEMO_MARKER, type DemoPrescription } from "../../data/demo-prescriptions";

vi.mock("../qr-code", () => ({
  default: ({ url }: { url: string }) => <span data-testid="qr-url">{url}</span>,
}));
vi.mock("../tag-writer", () => ({
  default: ({ url }: { url: string }) => <span data-testid="nfc-url">{url}</span>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("passes the server-returned URL unchanged to QR and NFC controls", async () => {
  const url = "https://medot.example/m/abcdefghijklmnopqrstuv";
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ token: "abcdefghijklmnopqrstuv", url }),
  })));
  render(<ProvisionForm medicines={[{
    id: "metformin-500",
    genericName: "Metformin",
    strength: "500 mg",
    dosageForm: "Tablet",
    catalogStatus: "DEMO_READY",
  }]} />);

  fireEvent.change(screen.getByLabelText("Batch on the sample strip"), { target: { value: "DEMO-A1" } });
  fireEvent.change(screen.getByLabelText("Labelled expiry month"), { target: { value: "2028-02" } });
  fireEvent.change(screen.getByLabelText("English instruction (required)"), { target: { value: "Test instruction" } });
  fireEvent.change(screen.getByLabelText("Bengali instruction (required)"), { target: { value: "ডেমো নির্দেশনা" } });
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I checked the medicine/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create pending record" }));

  expect((await screen.findByTestId("qr-url")).textContent).toBe(url);
  expect(screen.getByTestId("nfc-url").textContent).toBe(url);
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
  expect(body.instructionBn).toBe("ডেমো নির্দেশনা");
  expect(body).not.toHaveProperty("instructionHi");
});

const ready = { id: "paracetamol-500", genericName: "Paracetamol", strength: "500 mg", dosageForm: "Tablet", catalogStatus: "DEMO_READY" as const };
const blocked = { id: "rabijoi-dsr", brandName: "Rabijoi DSR", genericName: "Rabeprazole and Domperidone SR", strength: "Pack check required", dosageForm: "Capsule", catalogStatus: "PACK_CHECK_REQUIRED" as const };

it("offers custom medicine entry alongside selection", () => {
  render(<ProvisionForm medicines={[ready]} />);
  fireEvent.click(screen.getByRole("button", { name: "Add medicine" }));
  expect(screen.getByLabelText("Medicine name")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save blocked medicine" })).toBeTruthy();
});

it("records only selected timing and shows exact catalog notes in physical review", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ token: "abcdefghijklmnopqrstuv", url: "https://medot.example/m/abcdefghijklmnopqrstuv" }) })));
  render(<ProvisionForm medicines={[{ ...ready, infoEn: "Fictional information.", infoBn: "শুধুমাত্র ডেমো।" }]} />);
  fillManual();
  fireEvent.click(screen.getByRole("checkbox", { name: "Evening" }));
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  expect(screen.getByText("Fictional information.")).toBeTruthy();
  expect(screen.getByText("Evening")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: /I checked the medicine/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create pending record" }));
  await screen.findByTestId("qr-url");
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string).usageSlots).toEqual(["EVENING"]);
});

it("can recover a saved custom draft for review and disambiguates identical labels", () => {
  const draft = { ...ready, id: "custom_abcdefghijklmnopqrstuv", catalogStatus: "PACK_CHECK_REQUIRED" as const, recordKind: "FICTIONAL_DEMO" as const };
  render(<ProvisionForm medicines={[draft, ready, { ...ready, id: "duplicate-label" }]} />);
  const options = within(screen.getByLabelText("Medicine")).getAllByRole("option");
  expect(new Set(options.map(o => o.textContent)).size).toBe(options.length);
  fireEvent.change(screen.getByLabelText("Review a saved custom draft"), { target: { value: draft.id } });
  expect(screen.getByRole("heading", { name: "Review saved medicine" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Use this medicine" })).toBeNull();
});

it("disables blocked pack entries and rejects a manipulated selection", () => {
  render(<ProvisionForm medicines={[blocked, ready]} />);
  const selector = screen.getByLabelText("Medicine") as HTMLSelectElement;
  expect(selector.value).toBe(ready.id);
  const option = within(selector).getByRole("option", { name: /Rabijoi DSR/ }) as HTMLOptionElement;
  expect(option.disabled).toBe(true);
  fireEvent.change(selector, { target: { value: blocked.id } });
  expect(screen.getByRole("button", { name: "Review before creating" }).hasAttribute("disabled")).toBe(true);
});

it("cannot review missing Bengali and includes exact Hindi only when supplied", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ token: "abcdefghijklmnopqrstuv", url: "https://medot.example/m/abcdefghijklmnopqrstuv" }) })));
  render(<ProvisionForm medicines={[ready]} />);
  fireEvent.change(screen.getByLabelText("Batch on the sample strip"), { target: { value: "DEMO-ONLY" } });
  fireEvent.change(screen.getByLabelText("Labelled expiry month"), { target: { value: "2028-12" } });
  fireEvent.change(screen.getByLabelText("English instruction (required)"), { target: { value: "Demo only." } });
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  expect(screen.queryByRole("button", { name: "Confirm and create pending record" })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Bengali instruction (required)"), { target: { value: "শুধুমাত্র ডেমো।" } });
  fireEvent.change(screen.getByLabelText("Hindi instruction (optional)"), { target: { value: "केवल डेमो।" } });
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  expect(screen.getByText("শুধুমাত্র ডেমো।")).toBeTruthy();
  expect(screen.getByText("केवल डेमो।")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: /I checked the medicine/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create pending record" }));
  await screen.findByTestId("qr-url");
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)).toMatchObject({ instruction: "Demo only.", instructionBn: "শুধুমাত্র ডেমো।", instructionHi: "केवल डेमो।" });
});

function fillManual() {
  fireEvent.change(screen.getByLabelText("Batch on the sample strip"), { target: { value: " DEMO-A1 " } });
  fireEvent.change(screen.getByLabelText("Labelled expiry month"), { target: { value: "2028-12" } });
  fireEvent.change(screen.getByLabelText("English instruction (required)"), { target: { value: " Demo only. " } });
  fireEvent.change(screen.getByLabelText("Bengali instruction (required)"), { target: { value: " শুধুমাত্র ডেমো। " } });
}
const reviewed: DemoPrescription = { id: "REVIEWED-SOFTWARE-FIXTURE", demoMarker: DEMO_MARKER, reviewStatus: "REVIEWED", items: [{ id: "REVIEWED-ITEM", medicineId: ready.id, instruction: "Software demo only.", instructionBn: "সফটওয়্যার ডেমো।", instructionHi: "सॉफ़्टवेयर डेमो।" }] };

it("searches brand, generic and strength without silently changing the selected medicine", () => {
  render(<ProvisionForm medicines={[ready, blocked]} />);
  const search = screen.getByLabelText("Search medicine catalog");
  const choices = within(screen.getByLabelText("Medicine"));
  fireEvent.change(search, { target: { value: "Rabijoi" } });
  expect(choices.getByRole("option", { name: /Rabijoi DSR/ })).toBeTruthy();
  expect((screen.getByLabelText("Medicine") as HTMLSelectElement).value).toBe(ready.id);
  fireEvent.change(search, { target: { value: "Rabeprazole" } });
  expect(choices.getByRole("option", { name: /Rabijoi DSR/ })).toBeTruthy();
  fireEvent.change(search, { target: { value: "500 mg" } });
  expect(choices.queryByRole("option", { name: /Rabijoi DSR/ })).toBeNull();
  fireEvent.change(search, { target: { value: "no-such-label" } });
  expect(screen.getByText(/No matching catalog labels/)).toBeTruthy();
});
it("keeps drafts and blocked-pack presets disabled, applies only an explicit reviewed selection", () => {
  const draft = { ...reviewed, id: "DRAFT", reviewStatus: "DRAFT_REQUIRES_REVIEW" as const, items: [{ ...reviewed.items[0], id: "DRAFT-ITEM" }] };
  const blockedPreset = { ...reviewed, id: "BLOCKED", items: [{ ...reviewed.items[0], id: "BLOCKED-ITEM", medicineId: blocked.id }] };
  render(<ProvisionForm medicines={[ready, blocked]} prescriptions={[draft, blockedPreset, reviewed]} />);
  expect((screen.getByRole("option", { name: /DRAFT-ITEM/ }) as HTMLOptionElement).disabled).toBe(true);
  expect((screen.getByRole("option", { name: /BLOCKED-ITEM/ }) as HTMLOptionElement).disabled).toBe(true);
  expect((screen.getByLabelText("English instruction (required)") as HTMLTextAreaElement).value).toBe("");
  fireEvent.change(screen.getByLabelText("Reviewed demo preset"), { target: { value: "REVIEWED-ITEM" } });
  expect((screen.getByLabelText("English instruction (required)") as HTMLTextAreaElement).value).toBe(reviewed.items[0].instruction);
  expect((screen.getByLabelText("Hindi instruction (optional)") as HTMLTextAreaElement).value).toBe(reviewed.items[0].instructionHi);
  fireEvent.change(screen.getByLabelText("English instruction (required)"), { target: { value: "Changed software demo." } });
  expect((screen.getByLabelText("Bengali instruction (required)") as HTMLTextAreaElement).value).toBe("");
  expect((screen.getByLabelText("Hindi instruction (optional)") as HTMLTextAreaElement).value).toBe("");
});
it("requires physical confirmation of exact trimmed review values and locks a double submission", async () => {
  let resolve: (value: unknown) => void = () => {};
  const fetcher = vi.fn<(url: string, init: RequestInit) => Promise<unknown>>(() => new Promise(r => { resolve = r; }));
  vi.stubGlobal("fetch", fetcher);
  render(<ProvisionForm medicines={[{ ...ready, brandName: "Demo brand" }]} />);
  fillManual();
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  expect(screen.getByText(/Demo brand/)).toBeTruthy();
  const confirm = screen.getByRole("button", { name: "Confirm and create pending record" });
  expect(confirm.hasAttribute("disabled")).toBe(true);
  fireEvent.click(confirm);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: /I checked the medicine/ }));
  fireEvent.click(confirm); fireEvent.click(confirm);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(JSON.parse(fetcher.mock.calls[0][1].body as string)).toMatchObject({ batchNumber: "DEMO-A1", instruction: "Demo only.", instructionBn: "শুধুমাত্র ডেমো।" });
  await act(async () => { resolve({ ok: true, status: 201, json: async () => ({ token: "abcdefghijklmnopqrstuv", url: "https://medot.example/m/abcdefghijklmnopqrstuv" }) }); });
});
it("preserves an in-memory draft through session expiration with reauthentication in a new tab", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401 })));
  render(<ProvisionForm medicines={[ready]} />); fillManual();
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I checked the medicine/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create pending record" }));
  const signIn = await screen.findByRole("link", { name: "Sign in again in a new tab" });
  expect(signIn.getAttribute("target")).toBe("_blank");
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  expect((screen.getByLabelText("Bengali instruction (required)") as HTMLTextAreaElement).value.trim()).toBe("শুধুমাত্র ডেমো।");
});
